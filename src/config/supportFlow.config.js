// Backend-driven support flow definition
const flow = {
  startNode: 'start',
  nodes: {
    start: {
      id: 'start',
      type: 'options',
      message: 'Welcome to Sewa Bazar customer support.\n\nHow can we help you today?',
      options: [
        { id: 'payment',       label: 'Payment Issue' },
        { id: 'booking',       label: 'Booking Problem' },
        { id: 'technical',     label: 'Technical Issue' },
        { id: 'account',       label: 'Account Problem' },
        { id: 'worker_issue',  label: 'Worker Issue' },
        { id: 'other',         label: 'Other' },
      ],
      next: {
        payment:      'describe_issue',
        booking:      'describe_issue',
        technical:    'describe_issue',
        account:      'describe_issue',
        worker_issue: 'describe_issue',
        other:        'describe_issue',
      },
    },

    describe_issue: {
      id: 'describe_issue',
      type: 'text_input',
      message: 'You selected:\n{selectedLabel}\n\nWould you like to describe your issue before our support agent attends you?',
      options: [
        { id: 'yes',          label: 'Yes' },
        { id: 'no',           label: 'No' },
        { id: 'change_issue', label: 'Change Issue' },
      ],
      next: {
        yes:          'collect_description',
        no:           'completion',
        change_issue: 'start',
      },
      allowTextInput: false,
    },

    collect_description: {
      id: 'collect_description',
      type: 'text_input',
      message: 'Please describe your issue:',
      allowTextInput: true,
      next: 'completion',
    },

    completion: {
      id: 'completion',
      type: 'complete',
      message: 'Thank you.\nYour support ticket has been created.\n\nTicket ID: {ticketToken}\n\nOne of our support agents will attend you shortly.',
      actions: ['createTicket'],
    },
  },
};

module.exports = flow;