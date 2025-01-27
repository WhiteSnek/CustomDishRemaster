import * as pactum from 'pactum';
import FromData from 'form-data-lite'
describe('Customer API: ', () => {
  beforeAll(async () => {
    pactum.request.setBaseUrl('http://localhost:3001');
  });

  describe('Register: ', () => {
    const form = new FormData()
    form.append('fullname', 'Nikhil');
    form.append('email', 'nikhilkumar@gmail.com');
    form.append('password', 'nikhil123');
    form.append('mobileNumber', '1234567890')

    it('should successfully register the customer', async () => {
      const response = await pactum
        .spec()
        .post('/register')
        .withMultiPartFormData(form)
        .expectStatus(201)
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await pactum
        .spec()
        .post('/register')
        .withBody({})
        .expectStatus(400)
        .expectJsonLike({
          message: 'All fields is required',
        });
    });
    
    it('should return 409 if customer with the same email or mobile number exists', async () => {
      const response = await pactum
        .spec()
        .post('/register')
        .withBody(form)
        .expectStatus(409)
        .expectJsonLike({
          message: 'Customer with email or mobile number exists',
        });
    });


  });

  describe('Login', () => {
    const data = {
      email: 'nikhilkumar@gmail.com',
      password: 'nikhil123',
    }
    it('should throw 400 error if email is not provided', async() => {
      const response = await pactum
        .spec()
        .post('/login')
        .withBody({
          password: 'nikhil123',
        })
        .expectStatus(400)
        .stores('userAt', 'access_token');
    })
    it('should throw 404 error if user is not found', async() => {
      const response = await pactum
        .spec()
        .post('/login')
        .withBody({
          email: 'johndoe@gmail.com',
          password: 'nikhil123',
        })
        .expectStatus(404)
        .stores('userAt', 'access_token');
    })
    it('should throw 401 error if password is incorrect', async() => {
      const response = await pactum
        .spec()
        .post('/login')
        .withBody({
          email: 'nikhilkumar@gmail.com',
          password: 'wrong_password',
        })
        .expectStatus(401)
        .stores('userAt', 'access_token');
    })
    it('should successfully login the customer', async () => {
      const response = await pactum
        .spec()
        .post('/login')
        .withBody(data)
        .expectStatus(200)
        .stores('userAt', 'access_token');
    })
  })
});
