import * as pactum from 'pactum';

describe('Customer API: ', () => {
  beforeAll(async () => {
    pactum.request.setBaseUrl('http://localhost:3000/api/v1');
  });

  describe('Register: ', () => {
    const data = {
      fullname: 'Nikhil',
      email: 'nikhil@gmail.com',
      password: 'nikhil123',
      mobileNumber: '1234567890',
    };

    it('should return 400 if required fields are missing', async () => {
      const response = await pactum
        .spec()
        .post('/customers/register')
        .withBody({})
        .expectStatus(400)
        .expectJsonLike({
          message: 'All fields is required',
        });
    });

    it('should successfully register the customer', async () => {
      const response = await pactum
        .spec()
        .post('/customers/register')
        .withMultiPartFormData(data)
        .expectStatus(201)
        .expectJsonLike({
          message: 'Customer registered successfully',
          data: {
            fullname: data.fullname,
            email: data.email,
            mobileNumber: data.mobileNumber,
          },
        });
    });

    it('should return 409 if customer with the same email or mobile number exists', async () => {
      const response = await pactum
        .spec()
        .post('/customers/register')
        .withBody(data)
        .expectStatus(409)
        .expectJsonLike({
          message: 'Customer with email or mobile number exists',
        });
    });

    
  });
});
