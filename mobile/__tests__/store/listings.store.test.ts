import { useListingsStore } from '../../src/store/listings.store';

// Reset store state between tests
beforeEach(() => {
  useListingsStore.setState({
    listings: [],
    loading: false,
    error: null,
    draft: {
      photoUris: [],
      uploadedPhotoUrls: [],
      overrides: {},
      selectedPlatforms: [],
    },
  });
});

describe('listings store — draft helpers', () => {
  it('sets draft photos', () => {
    useListingsStore.getState().setDraftPhotos(['file://photo1.jpg', 'file://photo2.jpg']);
    expect(useListingsStore.getState().draft.photoUris).toHaveLength(2);
  });

  it('sets draft price', () => {
    useListingsStore.getState().setDraftPrice(65);
    expect(useListingsStore.getState().draft.price).toBe(65);
  });

  it('merges overrides', () => {
    useListingsStore.getState().setDraftOverrides({ brand: 'Nike' });
    useListingsStore.getState().setDraftOverrides({ condition: 'Good' });
    const { overrides } = useListingsStore.getState().draft;
    expect(overrides.brand).toBe('Nike');
    expect(overrides.condition).toBe('Good');
  });

  it('sets draft text', () => {
    useListingsStore.getState().setDraftText('Nike Air Max', 'Great condition sneakers');
    const { draft } = useListingsStore.getState();
    expect(draft.title).toBe('Nike Air Max');
    expect(draft.description).toBe('Great condition sneakers');
  });

  it('resets draft', () => {
    useListingsStore.getState().setDraftPrice(100);
    useListingsStore.getState().setDraftText('Title', 'Desc');
    useListingsStore.getState().resetDraft();
    const { draft } = useListingsStore.getState();
    expect(draft.price).toBeUndefined();
    expect(draft.title).toBeUndefined();
    expect(draft.photoUris).toHaveLength(0);
  });

  it('sets platform selection', () => {
    useListingsStore.getState().setDraftPlatforms(['EBAY', 'FACEBOOK']);
    expect(useListingsStore.getState().draft.selectedPlatforms).toEqual(['EBAY', 'FACEBOOK']);
  });
});

describe('listings store — listings CRUD helpers', () => {
  it('getListing returns undefined for unknown id', () => {
    expect(useListingsStore.getState().getListing('unknown')).toBeUndefined();
  });

  it('getListing finds listing by id', () => {
    const mockListing = {
      id: 'abc',
      userId: 'user1',
      title: 'Test',
      description: '',
      price: 50,
      currency: 'USD' as const,
      status: 'ACTIVE' as const,
      photos: [] as string[],
      platformListings: [],
      language: 'en' as const,
      createdAt: '',
      updatedAt: '',
    };
    useListingsStore.setState({ listings: [mockListing] });
    expect(useListingsStore.getState().getListing('abc')).toEqual(mockListing);
  });
});
