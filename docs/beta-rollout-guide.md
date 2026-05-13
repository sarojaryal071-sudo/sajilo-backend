# Sajilo – Beta Rollout Guide

How to use the built‑in beta rollout controls to launch gradually.

## 1. Enable Beta Mode

- [ ] Go to **Admin Panel → Feature Flags**
- [ ] Turn on `BETA_BANNER` – this shows a "Beta" notice in the frontend
- [ ] Turn on `MAINTENANCE_MODE` only if you need to block all non‑admin actions temporarily

## 2. Invite‑Only Signup

- [ ] Turn on `INVITE_ONLY_SIGNUP`
- [ ] Give invite codes or direct links to your first testers
- [ ] New signups without an invite will be rejected

## 3. Registration Freeze

- [ ] Turn on `REGISTRATION_FREEZE` to stop all new signups completely
- [ ] Existing users can still log in and use the platform
- [ ] Use this during critical bug fixes or maintenance

## 4. Worker Cap

- [ ] Set a policy in **Policies** page (or via API): `worker_cap` = maximum number of workers
- [ ] When the cap is reached, new worker applications are rejected
- [ ] Adjust the cap as your operations scale

## 5. Gradual Rollout

- [ ] Start with invite‑only workers and clients
- [ ] Monitor the **Activity Timeline** and **Live Operations** dashboard
- [ ] Gradually disable restrictions as you gain confidence
- [ ] Keep `BETA_BANNER` on until you officially launch

## 6. Full Launch

- [ ] Turn off all beta flags
- [ ] Announce the public launch via the **Announcements** system
- [ ] Keep monitoring the deployment page for any issues