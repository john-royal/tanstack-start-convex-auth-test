import { useSuspenseQueries } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import { convexQuery } from "~/utils/query-client";
import { Loader } from "~/components/Loader";

export const Route = createFileRoute("/")({
  component: Home,
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(convexQuery(api.auth.me, {}));
    void context.queryClient.prefetchQuery(
      convexQuery(api.board.getBoards, {})
    );
  },
  pendingComponent: () => <Loader />,
});

function Home() {
  const [userQuery, boardsQuery] = useSuspenseQueries({
    queries: [
      convexQuery(api.auth.me, {}),
      convexQuery(api.board.getBoards, {}),
    ],
  });

  return (
    <div className="p-8 space-y-2">
      <h1 className="text-2xl font-black">
        Welcome, {userQuery.data?.name ?? "Guest"}
      </h1>
      <ul className="flex flex-wrap list-disc">
        {boardsQuery.data.map((board) => (
          <li key={board.id} className="ml-4">
            <Link
              to="/boards/$boardId"
              params={{
                boardId: board.id,
              }}
              className="font-bold text-blue-500"
            >
              {board.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
