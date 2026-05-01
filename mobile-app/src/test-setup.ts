if (typeof jest !== 'undefined') {
  jest.mock('expo/src/winter/ImportMetaRegistry', () => ({
    ImportMetaRegistry: {
      get url() {
        return null;
      },
    },
  }));
}

if (typeof global.structuredClone === 'undefined') {
  try {
    Object.defineProperty(global, 'structuredClone', {
      configurable: true,
      writable: true,
      value: (object: unknown) => JSON.parse(JSON.stringify(object)),
    });
  } catch {
    // Ignore in runtimes where globals are read-only.
  }
}
