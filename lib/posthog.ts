// Stub for PostHog client to completely disable analytics and avoid network requests
const posthogMock = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  init: (..._args: any[]) => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  capture: (..._args: any[]) => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  identify: (..._args: any[]) => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  captureException: (..._args: any[]) => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opt_out_capturing: (..._args: any[]) => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opt_in_capturing: (..._args: any[]) => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reset: (..._args: any[]) => {},
}

export default posthogMock
