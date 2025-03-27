import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { api } from "convex/_generated/api";
import { Loader } from "~/components/Loader";
import { getSession, signOut } from "~/utils/actions";

export const Route = createFileRoute("/")({
  component: Home,
  loader: () => getSession(),
  pendingComponent: () => <Loader />,
});

function Home() {
  const { accessToken, expiresAt } = Route.useLoaderData();
  const handleSignOut = useServerFn(signOut);
  const boardsQuery = useSuspenseQuery(convexQuery(api.board.getBoards, {}));

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
      <pre>{JSON.stringify({ accessToken, expiresAt }, null, 2)}</pre>
      <button onClick={() => handleSignOut()}>Sign out</button>
    </div>
  );
}
