const express = require('express');
const amqp = require('amqplib/callback_api');

const app = express();
app.use(express.json());

let products = [
  { id: 1, name: 'Product A' },
  { id: 2, name: 'Product B' },
  { id: 3, name: 'Product C' }
];

function sendMessageToQueue(order) {
  amqp.connect('amqp://rabbitmq', (err, conn) => {
    if (err) {
      throw err;
    }
    conn.createChannel((err, channel) => {
      if (err) {
        throw err;
      }
      const queue = 'order_created';
      const msg = JSON.stringify(order);

      channel.assertQueue(queue, {
        durable: false
      });
      channel.sendToQueue(queue, Buffer.from(msg));
      console.log("Sent message to queue:", msg);
    });
    setTimeout(() => {
      conn.close();
    }, 500);
  });
}

app.post('/orders', (req, res) => {
  const { email, shippingAddress, productId } = req.body;

  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const order = {
    id: Date.now(),
    email,
    shippingAddress,
    product,
    status: 'Pending'
  };

  console.log('Order placed:', order);

  sendMessageToQueue(order);

  res.status(201).json(order);
});

app.get('/products', (req, res) => {
  res.json(products);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Order app listening on port ${PORT}`);
});
