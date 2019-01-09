/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';

import { Action, handleActions } from 'redux-actions';

import { DocumentSearchResult, RepositoryUri } from '../../model';
import {
  changeSearchScope,
  documentSearch as documentSearchQuery,
  documentSearchFailed,
  DocumentSearchPayload,
  documentSearchSuccess,
  repositorySearch as repositorySearchAction,
  repositorySearchFailed,
  RepositorySearchPayload,
  repositorySearchSuccess,
} from '../actions';
import { SearchScope } from '../common/types';

export interface SearchState {
  scope: SearchScope;
  query: string;
  page?: number;
  languages?: Set<string>;
  repositories?: Set<RepositoryUri>;
  isLoading: boolean;
  error?: Error;
  documentSearchResults?: DocumentSearchResult;
  repositorySearchResults?: any;
}

const initialState: SearchState = {
  query: '',
  isLoading: false,
  scope: SearchScope.default,
};

export const search = handleActions<SearchState, any>(
  {
    [String(changeSearchScope)]: (state: SearchState, action: Action<any>) =>
      produce<SearchState>(state, draft => {
        if (Object.values(SearchScope).includes(action.payload)) {
          draft.scope = action.payload;
        } else {
          draft.scope = SearchScope.default;
        }
        draft.isLoading = false;
      }),
    [String(documentSearchQuery)]: (state: SearchState, action: Action<DocumentSearchPayload>) =>
      produce<SearchState>(state, draft => {
        if (action.payload) {
          draft.query = action.payload.query;
          draft.page = parseInt(action.payload.page as string, 10);
          if (action.payload.languages) {
            draft.languages = new Set(decodeURIComponent(action.payload.languages).split(','));
          } else {
            draft.languages = new Set();
          }
          if (action.payload.repositories) {
            draft.repositories = new Set(
              decodeURIComponent(action.payload.repositories).split(',')
            );
          } else {
            draft.repositories = new Set();
          }
          draft.isLoading = true;
          draft.error = undefined;
        }
      }),
    [String(documentSearchSuccess)]: (state: SearchState, action: Action<DocumentSearchResult>) =>
      produce<SearchState>(state, draft => {
        const {
          from,
          page,
          totalPage,
          results,
          total,
          repoAggregations,
          langAggregations,
          took,
        } = action.payload!;
        draft.isLoading = false;

        const repoStats = repoAggregations!.map(agg => {
          return {
            name: agg.key,
            value: agg.doc_count,
          };
        });

        const languageStats = langAggregations!.map(agg => {
          return {
            name: agg.key,
            value: agg.doc_count,
          };
        });

        draft.documentSearchResults = {
          ...draft.documentSearchResults,
          query: state.query,
          total,
          took,
          stats: {
            total,
            from: from! + 1,
            to: from! + results!.length,
            page: page!,
            totalPage: totalPage!,
            repoStats,
            languageStats,
          },
          results,
        };
      }),
    [String(documentSearchFailed)]: (state: SearchState, action: Action<Error>) => {
      if (action.payload) {
        return produce<SearchState>(state, draft => {
          draft.isLoading = false;
          draft.error = action.payload!;
        });
      } else {
        return state;
      }
    },
    [String(repositorySearchAction)]: (
      state: SearchState,
      action: Action<RepositorySearchPayload>
    ) =>
      produce<SearchState>(state, draft => {
        if (action.payload) {
          draft.query = action.payload.query;
          draft.isLoading = true;
        }
      }),
    [String(repositorySearchSuccess)]: (state: SearchState, action: Action<any>) =>
      produce<SearchState>(state, draft => {
        draft.repositorySearchResults = action.payload;
        draft.isLoading = false;
      }),
    [String(repositorySearchFailed)]: (state: SearchState, action: Action<any>) => {
      if (action.payload) {
        return produce<SearchState>(state, draft => {
          draft.isLoading = false;
          draft.error = action.payload.error;
        });
      } else {
        return state;
      }
    },
  },
  initialState
);