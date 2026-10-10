/**
 * REQ-54 (Phase J), on screen: the inbox reads mail like mail. A deliverable opens into a
 * markdown body with attachments that expand in place; accepting and replying are the two
 * moves; and once the owner replies, the letter stays open but LOCKED — awaiting the
 * employee's answer — until the thread closes the loop.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InboxView } from '../src/views/InboxView';
import { useStore } from '../src/data/store';
import { api } from '../src/lib/api';

beforeEach(() => {
  cleanup();
  useStore.getState().chooseDemo();
  useStore.setState({ decisions: [] });
  useStore.getState().raiseMail({
    agentId: 'aria',
    shortRef: 'T-01',
    subject: 'Launch page draft',
    body: '# Draft\n\nThe copy is **ready** for your eyes.\n\n- hero\n- faq',
    attachments: [{ name: 'copy.md', kind: 'md', content: '# Copy\n\nEvery word, final.' }],
  });
});

describe('the mail app, rendered', () => {
  it('shows the letter in the open pile with its deliverable tag', async () => {
    render(<InboxView lang="en" />);
    await waitFor(() => expect(screen.getByText('Launch page draft')).toBeTruthy());
    expect(screen.getByText('deliverable')).toBeTruthy();
  });

  it('opens into a markdown body and an attachment that expands in place', async () => {
    const { container } = render(<InboxView lang="en" />);
    await waitFor(() => expect(screen.getByText('Launch page draft')).toBeTruthy());
    fireEvent.click(screen.getByText('Launch page draft'));
    // markdown rendered as real elements — strong and list, not literal asterisks
    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
    expect(container.querySelector('.markdown strong')).toBeTruthy();
    expect(screen.getByText('hero')).toBeTruthy();
    // the attachment opens where it sits
    fireEvent.click(screen.getByText('copy.md'));
    await waitFor(() => expect(container.querySelector('.mail-attach-body')?.textContent)
      .toContain('Every word, final.'));
    // and the two owner moves are there
    expect(container.querySelector('[data-mail-decide="approve"]')).toBeTruthy();
  });

  it('after the owner replies, the letter is open but locked until the employee answers', async () => {
    const { container } = render(<InboxView lang="en" />);
    await waitFor(() => expect(screen.getByText('Launch page draft')).toBeTruthy());
    const letter = useStore.getState().decisions.find((d) => d.kind === 'mail')!;
    api.answerDecision(letter.id, 'Ship it after one pass.');
    await waitFor(() => expect(container.querySelector('[data-mail-awaiting]')).toBeTruthy());
    fireEvent.click(screen.getByText('Launch page draft'));
    // the reply is shown, the lock is explained, and no second verdict is offered
    expect(container.querySelector('.mail-reply-given')?.textContent).toContain('Ship it after one pass');
    expect(container.querySelector('[data-mail-decide="approve"]')).toBeNull();
    // the employee's answer in their thread closes the letter
    const thread = useStore.getState().threads.find((th) => th.agentId === 'aria');
    useStore.getState().addMessage(thread!.id, 'aria', 'On it — one pass, then ship.');
    await waitFor(() => expect(container.querySelector('[data-mail-awaiting]')).toBeNull());
    // the open pile is empty — the letter lives on only in the history table
    expect(container.querySelector('.mailbox')).toBeNull();
    expect(screen.getByText('Launch page draft')).toBeTruthy();
  });
});
