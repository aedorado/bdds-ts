export function getPostHogClient() {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    capture: (..._args: any[]) => {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    identify: (..._args: any[]) => {},
    shutdown: async () => {},
  }
}


