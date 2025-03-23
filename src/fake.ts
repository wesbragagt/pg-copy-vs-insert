/*
 * Creates fake data for generating a csv file with 1000000 rows containing that data related to workers
 *    
  name          String
  email         String
  phone         String
  address       String
  city          String
  state         String
  zip           String
  country       String
 * */
import { faker } from '@faker-js/faker';

export function createWorker() {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zip: faker.location.zipCode(),
    country: faker.location.country(),
  }
}
