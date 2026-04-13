import { useMessagesStore } from '../../src/store/messages.store';

beforeEach(() => {
  useMessagesStore.setState({
    conversations: [],
    activeMessages: [],
    activeSuggestions: [],
    loading: false,
    error: null,
  });
});

describe('messages store', () => {
  it('totalUnread returns 0 when no conversations', () => {
    expect(useMessagesStore.getState().totalUnread()).toBe(0);
  });

  it('totalUnread sums unread counts', () => {
    useMessagesStore.setState({
      conversations: [
        {
          listingId: '1',
          listing: { id: '1', title: 'Item', price: 10, photos: [], status: 'ACTIVE' },
          platform: 'EBAY',
          buyerName: 'Alice',
          lastMessage: 'Is it available?',
          unreadCount: 3,
          updatedAt: '',
          messages: [],
        },
        {
          listingId: '2',
          listing: { id: '2', title: 'Item 2', price: 20, photos: [], status: 'ACTIVE' },
          platform: 'FACEBOOK',
          buyerName: 'Bob',
          lastMessage: 'Can you lower the price?',
          unreadCount: 1,
          updatedAt: '',
          messages: [],
        },
      ],
    } as never);
    expect(useMessagesStore.getState().totalUnread()).toBe(4);
  });

  it('clearSuggestions empties suggestions', () => {
    useMessagesStore.setState({ activeSuggestions: ['Yes!', 'No thanks'] });
    useMessagesStore.getState().clearSuggestions();
    expect(useMessagesStore.getState().activeSuggestions).toHaveLength(0);
  });
});
