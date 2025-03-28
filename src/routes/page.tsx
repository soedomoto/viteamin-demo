/* eslint-disable react-refresh/only-export-components */

import { defineMetadata, Metadata, definePage } from "@/vite-plugin-vitamin/page";

type User = {
  id: number;
  firstName: string;
  lastName: string;
  maidenName: string;
  age: number;
  gender: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  birthDate: string;
  image: string;
  bloodGroup: string;
  height: number;
  weight: number;
  eyeColor: string;
  hair: {
    color: string;
    type: string;
  };
  ip: string;
  address: {
    address: string;
    city: string;
    state: string;
    stateCode: string;
    postalCode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    country: string;
  };
  macAddress: string;
  university: string;
  bank: {
    cardExpire: string;
    cardNumber: string;
    cardType: string;
    currency: string;
    iban: string;
  };
  company: {
    department: string;
    name: string;
    title: string;
    address: {
      address: string;
      city: string;
      state: string;
      stateCode: string;
      postalCode: string;
      coordinates: {
        lat: number;
        lng: number;
      };
      country: string;
    };
  };
  ein: string;
  ssn: string;
  userAgent: string;
  crypto: {
    coin: string;
    wallet: string;
    network: string;
  };
  role: string;
}

export const generateMetadata = defineMetadata(() => {
  return {
    title: 'Root Page'
  } as Metadata
})

const Page = definePage(async function Page(props) {
  console.log(props)

  const { users = [], limit = 0, skip = 0, total = 0 } = await fetch('https://dummyjson.com/users')
    .then(res => res.json()) as { users: User[], limit: number, skip: number, total: number };

  return <>
    <div>Showing {limit} of {total}. {skip} skipped.</div>
    <table>
      <tr>
        <td>Left</td>
        <td>
          {
            users.map(u => (
              <>
                <div>
                  <b>{u?.id}.</b>
                  <b>{u?.firstName} {u?.lastName}</b>
                </div>
                <div>{u?.address?.address}</div>
              </>
            ))
          }
        </td>
      </tr>
    </table>
  </>
});

export default Page;