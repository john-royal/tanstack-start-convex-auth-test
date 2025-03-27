import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { api } from "convex/_generated/api";
import { Loader } from "~/components/Loader";
import { signOut } from "~/utils/actions";

export const Route = createFileRoute("/")({
  component: Home,
  loader: ({ context }) => {
    if (!context.auth) {
      throw redirect({ to: "/auth" });
    }
    void context.queryClient.prefetchQuery(
      convexQuery(api.auth.currentUser, {})
    );
    void context.queryClient.prefetchQuery(
      convexQuery(api.board.getBoards, {})
    );
  },
  pendingComponent: () => <Loader />,
});

function Home() {
  const handleSignOut = useServerFn(signOut);
  const boardsQuery = useSuspenseQuery(convexQuery(api.board.getBoards, {}));
  const userQuery = useSuspenseQuery(convexQuery(api.auth.currentUser, {}));

  return (
    <div className="p-8 space-y-2">
      <h1 className="text-2xl font-black">Boards</h1>
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
      <div className="flex items-center gap-2">
        <pre>{JSON.stringify(userQuery.data, null, 2)}</pre>
      </div>
      <button onClick={() => handleSignOut()}>Sign out</button>
    </div>
  );
}
