import type { Request, Response, NextFunction, RequestHandler } from "express";

export function asHandler<TReq extends Request>(
  fn: (req: TReq, res: Response) => Promise<unknown> | unknown,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as TReq, res)).catch(next);
  };
}
