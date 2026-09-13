import { Route, Routes } from "react-router";
import { AdminCategories } from "./features/AdminCategories";
import { AdminGames } from "./features/AdminGames";
import { AdminOverview } from "./features/AdminOverview";
import { AdminReviews } from "./features/AdminReviews";
import { GamePage } from "./features/GamePage";
import { ReviewPage } from "./features/reviews";
import { OrdersPage, OrderPage } from "./features/orders";
import { AuthProvider, RequireAuth } from "./auth/AuthProvider";
import { AuthPage } from "./auth/AuthPage";
import { AccountPage } from "./auth/AccountPage";
import { Layout } from "./components/Layout";
import { ErrorState } from "./components/ui";
import { CataloguePage, CategoryPage, HomePage } from "./features/catalogue";

export function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth admin>
                <AdminOverview />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <RequireAuth admin>
                <AdminCategories />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/games"
            element={
              <RequireAuth admin>
                <AdminGames />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <RequireAuth admin>
                <AdminReviews />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <RequireAuth admin>
                <OrdersPage admin />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route path="/games" element={<CataloguePage />} />
          <Route path="/games/:gameId" element={<GamePage />} />
          <Route
            path="/games/:gameId/reviews/:reviewId"
            element={<ReviewPage />}
          />
          <Route
            path="/orders"
            element={
              <RequireAuth>
                <OrdersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/orders/:orderId"
            element={
              <RequireAuth>
                <OrderPage />
              </RequireAuth>
            }
          />
          <Route path="/categories/:categoryId" element={<CategoryPage />} />
          <Route
            path="/login"
            element={<AuthPage key="login" mode="login" />}
          />
          <Route
            path="/register"
            element={<AuthPage key="register" mode="register" />}
          />
          <Route
            path="*"
            element={
              <ErrorState
                title="Page not found"
                message="This page does not exist. Let's find you a game instead."
              />
            }
          />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}
