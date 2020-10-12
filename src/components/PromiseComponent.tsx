import React, { ReactNode } from 'react';

const SYMBOL_ORIGINAL_RENDER = Symbol('PromiseComponent::originalRender');
const SYMBOL_PROMISE_RENDER = Symbol('PromiseComponent::render');
const SYMBOL_PROMISE = Symbol('PromiseComponent::promise');
const SYMBOL_WITH_FINALIZER = Symbol('PromiseComponent::withFinalizer');
const SYMBOL_CALLBACKS = Symbol('PromiseComponent::callbacks');
const SYMBOL_SERVE_REQUEST_DONE = Symbol('PromiseComponent::serveRequest::done');
const SYMBOL_CANCEL = Symbol('PromiseComponent::CANCEL');

export class PromiseComponent<
  PropsType = {},
  StateType = {},
  ResultArgumentType = any,
  ResultReturnType = any
> extends React.Component<PropsType, StateType> {
  private [SYMBOL_PROMISE]: Promise<any> | undefined;
  private [SYMBOL_CALLBACKS]: any = {};
  private [SYMBOL_ORIGINAL_RENDER]: any;
  private [SYMBOL_CANCEL] = Symbol('PromiseComponent::Cancel');
  private [SYMBOL_SERVE_REQUEST_DONE] = false;

  constructor(props: PropsType) {
    super(props);

    if (this.render) {
      this[SYMBOL_ORIGINAL_RENDER] = this.render.bind(this);

      Object.defineProperty(this, 'render', {
        get: () => this[SYMBOL_PROMISE_RENDER],
        set: (newRenderMethod) => (this[SYMBOL_ORIGINAL_RENDER] = newRenderMethod),
        configurable: false,
      });
    }
  }

  public render(): ReactNode | null {
    return null;
  }

  public result = async (arg?: ResultArgumentType): Promise<ResultReturnType> => {
    if (this[SYMBOL_PROMISE] && this[SYMBOL_CALLBACKS].reject) {
      this[SYMBOL_CALLBACKS].resolve(null);
    }
    const newPromise = (this[SYMBOL_PROMISE] = new Promise((resolve, reject) => {
      this[SYMBOL_CALLBACKS] = {
        resolve: this[SYMBOL_WITH_FINALIZER](resolve, true),
        reject: this[SYMBOL_WITH_FINALIZER](reject, false),
      };
    }));

    this[SYMBOL_SERVE_REQUEST_DONE] = false;
    this.serveRequest(arg).then(() => {
      this[SYMBOL_SERVE_REQUEST_DONE] = true;
      this.forceUpdate();
    });

    return newPromise;
  };

  protected resolve = (result: ResultReturnType) => {
    this[SYMBOL_PROMISE] = undefined;
    this.forceUpdate();
    this[SYMBOL_CALLBACKS].resolve(result);
  };

  protected reject = (error: Error) => {
    this[SYMBOL_PROMISE] = undefined;
    this.forceUpdate();
    this[SYMBOL_CALLBACKS].reject(error);
  };

  protected resolveWith = (result: ResultReturnType) => () => {
    this[SYMBOL_PROMISE] = undefined;
    this.forceUpdate();
    this[SYMBOL_CALLBACKS].resolve(result);
  };

  protected rejectWith = (error: ResultReturnType) => () => {
    this[SYMBOL_PROMISE] = undefined;
    this.forceUpdate();
    this[SYMBOL_CALLBACKS].reject(error);
  };

  protected serveRequest = async (arg?: any): Promise<void | null> => {
    return Promise.resolve(null);
  };

  protected finalizeRequest = async (arg: { resolved: boolean; result: any; CANCEL: symbol }): Promise<null | void> => {
    return Promise.resolve(null);
  };

  private [SYMBOL_WITH_FINALIZER] = (callback: (...args: any[]) => void, resolved: boolean) => async (
    result: ResultReturnType
  ) => {
    if (
      ((await this.finalizeRequest({ resolved, result, CANCEL: this[SYMBOL_CANCEL] })) as unknown) ===
      this[SYMBOL_CANCEL]
    ) {
      return;
    }

    return callback(result);
  };

  private [SYMBOL_PROMISE_RENDER] = () => {
    return this[SYMBOL_PROMISE] && this[SYMBOL_SERVE_REQUEST_DONE] ? this[SYMBOL_ORIGINAL_RENDER]() : null;
  };
}

export interface IPromiseComponent<ResultArgumentType = any, ResultReturnType = any> {
  result: (argument: ResultArgumentType) => ResultReturnType;
}
