import { Queue } from './queue';

describe('Queue', () => {
  it('dequeues items in FIFO order', () => {
    const queue = new Queue<string>();

    queue.enqueue('Sigiriya');
    queue.enqueue('Dambulla');
    queue.enqueue('Kandy');

    expect(queue.dequeue()).toBe('Sigiriya');
    expect(queue.dequeue()).toBe('Dambulla');
    expect(queue.dequeue()).toBe('Kandy');
  });

  it('peeks without removing the next item', () => {
    const queue = new Queue<number>();

    queue.enqueue(1);
    queue.enqueue(2);

    expect(queue.peek()).toBe(1);
    expect(queue.size()).toBe(2);
    expect(queue.dequeue()).toBe(1);
  });

  it('reports empty state and size correctly', () => {
    const queue = new Queue<string>();

    expect(queue.isEmpty()).toBe(true);
    expect(queue.size()).toBe(0);
    expect(queue.dequeue()).toBeUndefined();
    expect(queue.peek()).toBeUndefined();

    queue.enqueue('Colombo');

    expect(queue.isEmpty()).toBe(false);
    expect(queue.size()).toBe(1);
  });
});
