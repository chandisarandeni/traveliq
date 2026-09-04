import { AttractionMaxHeap } from './attraction-max-heap';
import { InterestCategory } from '../enums/interest-category.enum';
import { ScoredAttraction } from '../interfaces/attraction-selection.interface';

describe('AttractionMaxHeap', () => {
  let heap: AttractionMaxHeap;

  beforeEach(() => {
    heap = new AttractionMaxHeap();
  });

  it('should initialize empty heap', () => {
    expect(heap.isEmpty()).toBe(true);
    expect(heap.size()).toBe(0);
    expect(heap.peek()).toBeNull();
    expect(heap.extractMax()).toBeNull();
  });

  it('should handle single element insertion and extraction', () => {
    const item: ScoredAttraction = {
      attraction: {
        id: 'attr-1',
        name: 'Sigiriya Rock Fortress',
        categories: [InterestCategory.HISTORY, InterestCategory.CULTURE],
      },
      score: 8,
    };

    heap.insert(item);
    expect(heap.isEmpty()).toBe(false);
    expect(heap.size()).toBe(1);
    expect(heap.peek()).toEqual(item);

    const extracted = heap.extractMax();
    expect(extracted).toEqual(item);
    expect(heap.isEmpty()).toBe(true);
    expect(heap.size()).toBe(0);
  });

  it('should maintain max heap order across multiple insertions', () => {
    const items: ScoredAttraction[] = [
      {
        attraction: { id: '1', name: 'Beach A', categories: [InterestCategory.BEACH] },
        score: 3,
      },
      {
        attraction: { id: '2', name: 'Culture B', categories: [InterestCategory.CULTURE] },
        score: 10,
      },
      {
        attraction: { id: '3', name: 'Nature C', categories: [InterestCategory.NATURE] },
        score: 7,
      },
      {
        attraction: { id: '4', name: 'Adventure D', categories: [InterestCategory.ADVENTURE] },
        score: 15,
      },
      {
        attraction: { id: '5', name: 'Wildlife E', categories: [InterestCategory.WILDLIFE] },
        score: 1,
      },
    ];

    for (const item of items) {
      heap.insert(item);
    }

    expect(heap.size()).toBe(5);
    expect(heap.peek()?.score).toBe(15);

    const extractedScores: number[] = [];
    while (!heap.isEmpty()) {
      const max = heap.extractMax();
      if (max) extractedScores.push(max.score);
    }

    expect(extractedScores).toEqual([15, 10, 7, 3, 1]);
  });

  it('should correctly handle duplicate priority scores', () => {
    const item1: ScoredAttraction = {
      attraction: { id: 'attr-b', name: 'B Beach', categories: [InterestCategory.BEACH] },
      score: 5,
    };
    const item2: ScoredAttraction = {
      attraction: { id: 'attr-a', name: 'A Temple', categories: [InterestCategory.CULTURE] },
      score: 5,
    };

    heap.insert(item1);
    heap.insert(item2);

    expect(heap.size()).toBe(2);
    // Secondary tie-breaker sorts 'attr-a' before 'attr-b'
    const firstExtracted = heap.extractMax();
    const secondExtracted = heap.extractMax();

    expect(firstExtracted?.attraction.id).toBe('attr-a');
    expect(secondExtracted?.attraction.id).toBe('attr-b');
  });

  it('should throw error when inserting item without numeric score', () => {
    expect(() => heap.insert(null as any)).toThrow();
    expect(() => heap.insert({ attraction: {} as any, score: 'invalid' as any })).toThrow();
  });
});
