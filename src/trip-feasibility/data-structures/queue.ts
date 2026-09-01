/**
 * FIFO queue used to process the already optimized route in order.
 *
 * The head pointer avoids Array.shift(), which would re-index the array on
 * every dequeue. enqueue, dequeue, and peek are O(1) for this use case.
 */
export class Queue<T> {
  private items: T[] = [];
  private head = 0;

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }

    const item = this.items[this.head];
    this.head += 1;

    // Compact old slots occasionally so long routes do not keep unused memory.
    if (this.head > 50 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }

    return item;
  }

  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }

    return this.items[this.head];
  }

  isEmpty(): boolean {
    return this.head >= this.items.length;
  }

  size(): number {
    return this.items.length - this.head;
  }
}
