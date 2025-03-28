import { defineLayout } from "@/vite-plugin-vitamin/page";

const Layout = defineLayout(function Layout(props) {
  return <html>
    <head>
      <title>{props?.metadata?.title}</title>
    </head>
    <head>
      {props.children}
    </head>
  </html>
});

export default Layout;