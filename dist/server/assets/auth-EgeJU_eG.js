import { T as TSS_SERVER_FUNCTION, c as createServerFn } from "../server.js";
import { getUser } from "@netlify/identity";
import "node:async_hooks";
import "node:stream";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
var createServerRpc = (serverFnMeta, splitImportFn) => {
  const url = "/_serverFn/" + serverFnMeta.id;
  return Object.assign(splitImportFn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const getServerUser_createServerFn_handler = createServerRpc({
  id: "49106938b52c8bf2e7795ac418917757130e43844a341613882f98c174227919",
  name: "getServerUser",
  filename: "src/lib/auth.ts"
}, (opts) => getServerUser.__executeServer(opts));
const getServerUser = createServerFn({
  method: "GET"
}).handler(getServerUser_createServerFn_handler, async () => {
  const user = await getUser();
  return user ?? null;
});
export {
  getServerUser_createServerFn_handler
};
