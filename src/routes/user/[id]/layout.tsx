import { defineLayout } from "@/vite-plugin-vitamin/page";

const Layout = defineLayout(function Layout(props) {
  return <>{props.children}</>
});

export default Layout;