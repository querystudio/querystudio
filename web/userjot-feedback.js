window.$ujq = window.$ujq || [];
window.uj =
  window.uj ||
  new Proxy(
    {},
    {
      get:
        (_, p) =>
        (...a) =>
          window.$ujq.push([p, ...a]),
    },
  );
document.head.appendChild(
  Object.assign(document.createElement("script"), {
    src: "https://cdn.userjot.com/sdk/v2/uj.js",
    type: "module",
    async: !0,
  }),
);

window.uj.init("cmkon0iqi055g15moaxmxwn4g", {
  widget: true,
});
