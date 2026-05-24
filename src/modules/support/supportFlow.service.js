// Support Flow Service – resolves flow nodes, validates transitions, executes actions
const flow = require('../../config/supportFlow.config');
const supportTicketService = require('../support/supportTicket.service');
const chatModel = require('../chat/chat.model');
const { pool } = require('../../config/database');

/**
 * Save a system message into the conversation.
 */
async function saveSystemMessage(conversationId, adminId, text) {
  await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, receiver_id, text, read, created_at)
     VALUES ($1, $2, $3, $4, TRUE, NOW())`,
    [conversationId, adminId, adminId, text]
  );
  // Update the conversation's last_message so the inbox tile shows it
  await pool.query(
    `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
    [text, conversationId]
  );
}

/**
 * Initialize a support session:
 * - Creates a unique conversation with admin
 * - Saves the first system message
 * - Returns the first flow node and flow state
 */
async function startSession(userId, userRole) {
  // 1. Get admin user
  const adminResult = await pool.query(
    `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
  );
  if (adminResult.rows.length === 0) {
    throw new Error('No admin available');
  }
  const adminId = adminResult.rows[0].id;

  let customerId, workerId;
  if (userRole === 'customer') {
    customerId = userId;
    workerId = adminId;
  } else {
    customerId = adminId;
    workerId = userId;
  }

  // 2. Create a unique conversation for every support session (never reuse)
  const uniqueBookingId = -1 * Math.floor(Date.now() / 1000);  // fits int4
  const conversationType = userRole === 'customer' ? 'customer_admin' : 'worker_admin';
  const convResult = await pool.query(
    `INSERT INTO conversations (customer_id, worker_id, booking_id, conversation_type, is_initiated)
     VALUES ($1, $2, $3, $4, FALSE)
     RETURNING *`,
    [customerId, workerId, uniqueBookingId, conversationType]
  );
  const conversation = convResult.rows[0];

  // 3. Get first node and save its system message
  const firstNode = flow.nodes[flow.startNode];
  if (!firstNode) {
    throw new Error('Flow start node not found');
  }
  await saveSystemMessage(conversation.id, adminId, firstNode.message);

  return {
    conversation,
    node: {
      id: firstNode.id,
      type: firstNode.type,
      message: firstNode.message,
      options: firstNode.options || null,
      allowTextInput: firstNode.allowTextInput || false,
    },
    flowState: {
      conversationId: conversation.id,
      currentNodeId: firstNode.id,
      selectedCategory: null,
      selectedLabel: null,
      description: null,
      clientId: userId,
      adminId: adminId,
    },
  };
}

/**
 * Process the next step in the flow:
 * - Validates transition
 * - Saves user's choice and next system message
 * - Executes actions (like createTicket) on the target node
 * - Returns the next node and updated state
 */
async function nextNode(conversationId, currentNodeId, selectedOption, input = null, flowState = {}) {
  const currentNode = flow.nodes[currentNodeId];
  if (!currentNode) {
    throw new Error(`Unknown node: ${currentNodeId}`);
  }

  // Determine next node ID
  let nextNodeId;
  if (typeof currentNode.next === 'string') {
    nextNodeId = currentNode.next;
  } else {
    nextNodeId = currentNode.next?.[selectedOption];
  }

  if (!nextNodeId) {
    throw new Error(`Invalid transition from ${currentNodeId} with option ${selectedOption}`);
  }

  const nextNode = flow.nodes[nextNodeId];
  if (!nextNode) {
    throw new Error(`Unknown node: ${nextNodeId}`);
  }

  // Build updated state
  const updatedState = { ...flowState, currentNodeId: nextNodeId };

  // If the current node is the start node, capture the selected category and label
  if (currentNode.type === 'options' && currentNode.options) {
    const selectedOptionObj = currentNode.options.find(o => o.id === selectedOption);
    if (selectedOptionObj) {
      updatedState.selectedCategory = selectedOption;
      updatedState.selectedLabel = selectedOptionObj.label;
    }
  }

  // If the current node is 'collect_description', store the input
  if (currentNodeId === 'collect_description' && input) {
    updatedState.description = input;
  }

  // If the current node is 'describe_issue' and selectedOption is 'no', ensure description is null
  if (currentNodeId === 'describe_issue' && selectedOption === 'no') {
    updatedState.description = null;
  }

  // Prepare node message and replace known placeholders now
  let nodeMessage = nextNode.message || '';
  nodeMessage = nodeMessage.replace('{selectedLabel}', updatedState.selectedLabel || '');

  // ── Persist user message and update conversation last_message ──
  const adminId = flowState.adminId;
  const userText = input || selectedOption;
  await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, receiver_id, text, read, created_at)
     VALUES ($1, $2, $3, $4, FALSE, NOW())`,
    [conversationId, flowState.clientId, adminId, userText]
  );
  await pool.query(
    `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
    [userText, conversationId]
  );

  // Execute actions on the next node (create ticket if needed)
  let createdTicket = null;
  if (nextNode.actions && nextNode.actions.includes('createTicket')) {
    createdTicket = await supportTicketService.createTicket(
      conversationId,
      flowState.clientId,
      updatedState.selectedCategory || 'other',
      'normal',
      updatedState.description || null
    );
    updatedState.ticketToken = createdTicket.ticket_token;

    // Replace the ticketToken placeholder with the real token
    nodeMessage = nodeMessage.replace('{ticketToken}', createdTicket.ticket_token);

    // Mark conversation as initiated so it appears in the inbox
    await pool.query(
      `UPDATE conversations SET is_initiated = TRUE WHERE id = $1`,
      [conversationId]
    );
  }

  // ── Persist system message with placeholders already replaced ──
  if (nodeMessage) {
    await saveSystemMessage(conversationId, adminId, nodeMessage);
  }

  return {
    node: {
      id: nextNode.id,
      type: nextNode.type,
      message: nodeMessage,
      options: nextNode.options || null,
      allowTextInput: nextNode.allowTextInput || false,
    },
    completed: !!nextNode.actions?.includes('createTicket'),
    createdTicket: createdTicket ? {
      id: createdTicket.id,
      token: createdTicket.ticket_token,
      category: createdTicket.category,
      status: createdTicket.status,
    } : null,
    flowState: updatedState,
  };
}

module.exports = { startSession, nextNode };