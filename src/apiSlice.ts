import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Task {
  id: number;
  value: string; 
  completed: boolean; 
}

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:3000" }),
  tagTypes: ["Tasks"],
  endpoints: (builder) => ({
    getTasks: builder.query<Task[], void>({
      query: () => "/tasks",
      transformResponse: (tasks: Task[]) => tasks.reverse(),
      providesTags: ["Tasks"],
    }),
    addTask: builder.mutation<Task, Partial<Task>>({
      query: (task) => ({
        url: "/tasks",
        method: "POST",
        body: {
          value: task.value ?? "New Task",
          completed: task.completed ?? false,
        },
      }),
      invalidatesTags: ["Tasks"],
      async onQueryStarted(task, { dispatch, queryFulfilled }) {
        // Optimistically update the cache
        const patchResult = dispatch(
          api.util.updateQueryData("getTasks", undefined, (draft) => {
            draft.unshift({
              id: 0,  // Use placeholder id (to be replaced by the server response)
              value: task.value ?? "New Task",
              completed: task.completed ?? false,
            });
          })
        );

        try {
          const { data } = await queryFulfilled;
          // Update the cache with the actual task id from the server response
          patchResult.undo();
          dispatch(
            api.util.updateQueryData("getTasks", undefined, (tasksList) => {
              const taskIndex = tasksList.findIndex((el) => el.id === 0);
              if (taskIndex >= 0) {
                tasksList[taskIndex] = data;
              }
            })
          );
        } catch (err) {
          console.error("Add task failed", err);
          patchResult.undo(); // Revert cache on error
        }
      },
    }),
    updateTask: builder.mutation<Task, Partial<Task> & Pick<Task, "id">>({
      query: ({ id, ...updatedTask }) => ({
        url: `/tasks/${id}`,
        method: "PATCH",
        body: {
          ...updatedTask,
          value: updatedTask.value ?? "Updated Task", 
          completed: updatedTask.completed ?? false, 
        },
      }),
      invalidatesTags: ["Tasks"],
      async onQueryStarted({ id, ...updatedTask }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          api.util.updateQueryData("getTasks", undefined, (tasksList) => {
            const taskIndex = tasksList.findIndex((el) => el.id === id);
            if (taskIndex >= 0) {
              const taskToUpdate = tasksList[taskIndex];
              tasksList[taskIndex] = {
                ...taskToUpdate,
                value: updatedTask.value ?? taskToUpdate.value, 
                completed: updatedTask.completed ?? taskToUpdate.completed, 
              };
            }
          })
        );

        try {
          await queryFulfilled;
        } catch (err) {
          console.error("Update task failed", err);
          patchResult.undo(); // Revert cache on error
        }
      },
    }),
    deleteTask: builder.mutation<void, number>({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Tasks"],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          api.util.updateQueryData("getTasks", undefined, (tasksList) => {
            const taskIndex = tasksList.findIndex((el) => el.id === id);
            if (taskIndex >= 0) {
              tasksList.splice(taskIndex, 1);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch (err) {
          console.error("Delete task failed", err);
          patchResult.undo(); // Revert cache on error
        }
      },
    }),
  }),
});

export const {
  useGetTasksQuery,
  useAddTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} = api;
