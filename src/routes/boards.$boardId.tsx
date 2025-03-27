import { createFileRoute, redirect } from "@tanstack/react-router";
import { Board } from "~/components/Board";
import { Loader } from "~/components/Loader";
import { boardQueries } from "~/queries";

export const Route = createFileRoute("/boards/$boardId")({
  component: Home,
  pendingComponent: () => <Loader />,
  loader: ({ params, context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/auth" });
    }
    void context.queryClient.prefetchQuery(boardQueries.detail(params.boardId));
  },
});

function Home() {
  const { boardId } = Route.useParams();

  return <Board boardId={boardId} />;
}
