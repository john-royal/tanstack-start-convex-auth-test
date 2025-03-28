/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as IndexImport } from './routes/index'
import { Route as BoardsBoardIdImport } from './routes/boards.$boardId'
import { Route as AuthGithubCallbackImport } from './routes/auth.github.callback'

// Create/Update Routes

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const BoardsBoardIdRoute = BoardsBoardIdImport.update({
  id: '/boards/$boardId',
  path: '/boards/$boardId',
  getParentRoute: () => rootRoute,
} as any)

const AuthGithubCallbackRoute = AuthGithubCallbackImport.update({
  id: '/auth/github/callback',
  path: '/auth/github/callback',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/boards/$boardId': {
      id: '/boards/$boardId'
      path: '/boards/$boardId'
      fullPath: '/boards/$boardId'
      preLoaderRoute: typeof BoardsBoardIdImport
      parentRoute: typeof rootRoute
    }
    '/auth/github/callback': {
      id: '/auth/github/callback'
      path: '/auth/github/callback'
      fullPath: '/auth/github/callback'
      preLoaderRoute: typeof AuthGithubCallbackImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/boards/$boardId': typeof BoardsBoardIdRoute
  '/auth/github/callback': typeof AuthGithubCallbackRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/boards/$boardId': typeof BoardsBoardIdRoute
  '/auth/github/callback': typeof AuthGithubCallbackRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/boards/$boardId': typeof BoardsBoardIdRoute
  '/auth/github/callback': typeof AuthGithubCallbackRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/boards/$boardId' | '/auth/github/callback'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/boards/$boardId' | '/auth/github/callback'
  id: '__root__' | '/' | '/boards/$boardId' | '/auth/github/callback'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  BoardsBoardIdRoute: typeof BoardsBoardIdRoute
  AuthGithubCallbackRoute: typeof AuthGithubCallbackRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  BoardsBoardIdRoute: BoardsBoardIdRoute,
  AuthGithubCallbackRoute: AuthGithubCallbackRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/boards/$boardId",
        "/auth/github/callback"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/boards/$boardId": {
      "filePath": "boards.$boardId.tsx"
    },
    "/auth/github/callback": {
      "filePath": "auth.github.callback.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
