import "matter-js";

declare module "matter-js" {
  interface Body {
    ignoreGravity?: boolean;
  }

  namespace Engine {
    let _bodiesApplyGravity: (bodies: Body[], gravity: Gravity) => void;
  }
}