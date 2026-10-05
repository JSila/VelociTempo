import { configureStore } from '@reduxjs/toolkit'
import { worklogSlice } from '../features/worklog/worklogSlice'
import { api } from './api'

export const store = configureStore({
    reducer: {
        [worklogSlice.reducerPath]: worklogSlice.reducer,
        [api.reducerPath]: api.reducer,
    },
    middleware: (getDefault) => getDefault().concat(api.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
