/**
 * FIFO queue used to process the already optimized route in order.
 *
 * The head pointer avoids Array.shift(), which would re-index the array on
 * every dequeue. enqueue, dequeue, and peek are O(1) for this use case.
 */
export class Queue<T> {
  // Stores queued items without removing old array elements on each dequeue.
  private items: T[] = [];

  // Points to the current front item in the queue.
  private head = 0;

  // Adds a new item to the rear of the queue.
  enqueue(item: T): void {
    this.items.push(item);
  }

  // Removes and returns the front item, or undefined when the queue is empty.
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

  // Returns the front item without removing it.
  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }

    return this.items[this.head];
  }

  // True when every queued item has already been dequeued.
  isEmpty(): boolean {
    return this.head >= this.items.length;
  }

  // Number of items still waiting in the queue.
  size(): number {
    return this.items.length - this.head;
  }
}
