import Card from "@/components/Card";
import { definePage } from "@/vite-plugin-vitamin/page";

const Page = definePage(function(props) {
  console.log(props)

  return <div>
    <Card />
  </div>
});

export default Page;