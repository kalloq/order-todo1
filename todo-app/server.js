const express = require('express');
const amqp = require('amqplib/callback_api');

const app = express();
app.use(express.json());

let tasks = [
  { id: 1, title: 'First Task', completed: false },
  { id: 2, title: 'Second Task', completed: true }
];

app.get('/tasks', (req, res) => {
  res.json(tasks);
});

app.post('/tasks', (req, res) => {
  const newTask = {
    id: tasks.length + 1,
    title: req.body.title,
    completed: false
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

function connectToRabbitMQ() {
  amqp.connect('amqp://rabbitmq', (err, conn) => {
    if (err) {
      throw err;
    }
    conn.createChannel((err, channel) => {
      if (err) {
        throw err;
      }
      const queue = 'order_created';

      channel.assertQueue(queue, {
        durable: false
      });

      console.log('Waiting for messages in %s. To exit press CTRL+C', queue);

      channel.consume(queue, (msg) => {
        const content = JSON.parse(msg.content.toString());
        const newTask = {
          id: tasks.length + 1,
          title: `Process order for ${content.email}`,
          completed: false
        };
        tasks.push(newTask);
        console.log('New task created from order:', newTask);
      }, { noAck: true });
    });
  });
}

connectToRabbitMQ();

app.put('/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  const task = tasks.find(task => task.id === taskId);

  if (task) {
    task.title = req.body.title || task.title;
    task.completed = req.body.completed !== undefined ? req.body.completed : task.completed;
    res.json(task);
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

app.delete('/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  tasks = tasks.filter(task => task.id !== taskId);
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TODO app listening on port ${PORT}`);
});
