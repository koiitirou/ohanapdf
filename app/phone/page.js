import { Suspense } from "react";
import Phone from "./phone";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Phone />
    </Suspense>
  );
}
