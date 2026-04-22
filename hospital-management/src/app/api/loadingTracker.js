let pendingRequests = 0;
const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => {
    try {
      listener(pendingRequests);
    } catch {
      // no-op
    }
  });
};

export const beginApiRequest = () => {
  pendingRequests += 1;
  emit();
};

export const endApiRequest = () => {
  pendingRequests = Math.max(0, pendingRequests - 1);
  emit();
};

export const getPendingApiRequests = () => pendingRequests;

export const subscribeApiLoading = (listener) => {
  if (typeof listener !== "function") {
    return () => {};
  }
  listeners.add(listener);
  listener(pendingRequests);
  return () => {
    listeners.delete(listener);
  };
};
