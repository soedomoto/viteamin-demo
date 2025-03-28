/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { JSX, PropsWithChildren } from "react";

export type VitaminRequest = {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string>;
  params: Record<string, string>;
  body: any;
  rawBody?: string | Buffer;
  ip?: string;
  getHeader(name: string): string | string[] | undefined;
}

// Page Metadata Definition

export type MetadataParams = {
  request?: Promise<{ id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export class Metadata {
  title?: string;

  generate?: (request?: VitaminRequest, parent?: Metadata) => Metadata
  constructor(fn?: (request?: VitaminRequest, parent?: Metadata) => Metadata) {
    this.generate = fn;
  }
  static newInstance(fn: (request?: VitaminRequest, parent?: Metadata) => Metadata) {
    return new Metadata(fn);
  }
}

export const defineMetadata = (constructor: (params?: VitaminRequest, parent?: Metadata) => Metadata) => {
  return Metadata.newInstance(constructor);
}

// Page Component Definition

type SyncPageComponent<P> = (props: P & PropsWithChildren & { request?: VitaminRequest } & { metadata?: Metadata }) => JSX.Element;
type AsyncPageComponent<P> = (props: P & PropsWithChildren & { request?: VitaminRequest } & { metadata?: Metadata }) => Promise<JSX.Element>;
export type PageComponent<P> = SyncPageComponent<P> | AsyncPageComponent<P>;

function _definePage<P extends object>(component: PageComponent<P>): PageComponent<P> {
  return component;
}

export function definePage<P extends object = {}>(WrappedComponent: PageComponent<P>): PageComponent<P> {
  return _definePage<P>(async function EnhancedComponent(props: P & { request?: VitaminRequest } & { metadata?: Metadata } = {} as P & { request?: VitaminRequest } & { metadata?: Metadata }): Promise<JSX.Element> {
    const enhancedProps = {
      ...(props || {}),
      enhanced: true,
    } as P & { request?: VitaminRequest } & { metadata?: Metadata };

    try {
      const result = WrappedComponent(enhancedProps);
      if (result instanceof Promise) {
        return await result;
      }
      return result;
    } catch (error) {
      console.error('Error in enhanced component:', error);
      throw error;
    }
  });
}

export const defineLayout = definePage;