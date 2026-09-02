import { ScoredAttraction } from '../interfaces/attraction-selection.interface';

/**
 * AttractionMaxHeap
 *
 * Data Structures & Algorithms Coursework Implementation:
 * A binary Max Heap data structure implemented using an dynamic Array.
 * The heap prioritizes ScoredAttraction elements by their computed interest score.
 *
 * Invariant: For any given index i > 0, heap[parent(i)].score >= heap[i].score
 *
 * Algorithmic Complexities:
 * - insert: O(log n) time
 * - extractMax: O(log n) time
 * - peek: O(1) time
 * - size: O(1) time
 * - isEmpty: O(1) time
 * - Space Complexity: O(n) where n is number of stored attractions
 */
export class AttractionMaxHeap {
  private heap: ScoredAttraction[] = [];

  /**
   * Returns the current number of elements in the Max Heap.
   * Complexity: O(1) time
   */
  public size(): number {
    return this.heap.length;
  }

  /**
   * Checks if the Max Heap is empty.
   * Complexity: O(1) time
   */
  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Returns the maximum priority element without removing it from the heap.
   * Complexity: O(1) time
   * @returns ScoredAttraction with highest interest score, or null if empty
   */
  public peek(): ScoredAttraction | null {
    if (this.isEmpty()) {
      return null;
    }
    return this.heap[0];
  }

  /**
   * Inserts a new ScoredAttraction into the Max Heap.
   * Appends element to end of array and performs heapify-up to maintain max-heap property.
   * Complexity: O(log n) time
   * @param item ScoredAttraction object containing attraction and score
   */
  public insert(item: ScoredAttraction): void {
    if (!item || typeof item.score !== 'number') {
      throw new Error('Invalid item: ScoredAttraction must have a numeric score.');
    }
    this.heap.push(item);
    this.heapifyUp(this.heap.length - 1);
  }

  /**
   * Removes and returns the element with the maximum interest score from the heap.
   * Replaces root with last element and performs heapify-down to restore heap invariant.
   * Complexity: O(log n) time
   * @returns ScoredAttraction with highest priority, or null if empty
   */
  public extractMax(): ScoredAttraction | null {
    if (this.isEmpty()) {
      return null;
    }

    const maxItem = this.heap[0];
    const lastItem = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = lastItem;
      this.heapifyDown(0);
    }

    return maxItem;
  }

  /**
   * Restores the max-heap property upwards from index `index`.
   * Complexity: O(log n) time
   */
  private heapifyUp(index: number): void {
    let currentIndex = index;

    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);

      if (this.shouldSwap(parentIndex, currentIndex)) {
        this.swap(parentIndex, currentIndex);
        currentIndex = parentIndex;
      } else {
        break;
      }
    }
  }

  /**
   * Restores the max-heap property downwards from index `index`.
   * Complexity: O(log n) time
   */
  private heapifyDown(index: number): void {
    let currentIndex = index;
    const length = this.heap.length;

    while (true) {
      const leftChildIndex = 2 * currentIndex + 1;
      const rightChildIndex = 2 * currentIndex + 2;
      let largestIndex = currentIndex;

      if (
        leftChildIndex < length &&
        this.shouldSwap(largestIndex, leftChildIndex)
      ) {
        largestIndex = leftChildIndex;
      }

      if (
        rightChildIndex < length &&
        this.shouldSwap(largestIndex, rightChildIndex)
      ) {
        largestIndex = rightChildIndex;
      }

      if (largestIndex !== currentIndex) {
        this.swap(currentIndex, largestIndex);
        currentIndex = largestIndex;
      } else {
        break;
      }
    }
  }

  /**
   * Determines if candidate child has higher priority than current node.
   * Primary key: interest score (higher is better).
   * Secondary key: attraction ID (alphabetical comparison for stable deterministic sorting on equal scores).
   */
  private shouldSwap(parentIndex: number, childIndex: number): boolean {
    const parent = this.heap[parentIndex];
    const child = this.heap[childIndex];

    if (child.score > parent.score) {
      return true;
    }

    if (child.score === parent.score) {
      // Tie breaker: compare attraction IDs for deterministic order
      return child.attraction.id < parent.attraction.id;
    }

    return false;
  }

  /**
   * Swaps elements at index i and index j in the heap array.
   */
  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}
