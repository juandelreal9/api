require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'miBD';

app.use(cors());
app.use(express.json());

let db;
let empleadosCollection;

// Conexión única y reutilizable a MongoDB Atlas
async function connectDB() {
  try {
    if (!URI) {
      throw new Error('Configura MONGO_URI o MONGODB_URI en el archivo .env');
    }

    const client = new MongoClient(URI);
    await client.connect();
    db = client.db(DB_NAME);
    empleadosCollection = db.collection('Empleados');
    console.log(`Conectado exitosamente a MongoDB Atlas (BD: ${DB_NAME})`);
  } catch (error) {
    console.error('Error al conectar con MongoDB Atlas:', error.message);
    process.exit(1);
  }
}

// Ruta base de comprobación
app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Empleados en línea' });
});

// 1. GET: Obtener todos los empleados
app.get('/api/empleados', async (req, res) => {
  try {
    const empleados = await empleadosCollection.find({}).toArray();
    res.status(200).json(empleados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET: Obtener un empleado por su Clave numérica
app.get('/api/empleados/:clave', async (req, res) => {
  try {
    const claveNum = Number(req.params.clave);
    const empleado = await empleadosCollection.findOne({ Clave: claveNum });
    if (!empleado) {
      return res.status(404).json({ mensaje: 'Empleado no encontrado' });
    }
    res.status(200).json(empleado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST: Registrar nuevo empleado
app.post('/api/empleados', async (req, res) => {
  try {
    const { Clave, Nombre, direccion, fechadenacimiento, sexo, tipodesangre } = req.body;

    if (Clave === undefined || !Nombre) {
      return res.status(400).json({ error: 'Clave y Nombre son requeridos' });
    }

    const existe = await empleadosCollection.findOne({ Clave: Number(Clave) });
    if (existe) {
      return res.status(409).json({ error: 'Ya existe un empleado con esa Clave' });
    }

    const nuevoEmpleado = {
      Clave: Number(Clave),
      Nombre: String(Nombre),
      direccion: String(direccion || ''),
      fechadenacimiento: fechadenacimiento ? new Date(fechadenacimiento) : null, // BSON Date
      sexo: sexo,
      tipodesangre: String(tipodesangre || '')
    };

    const resultado = await empleadosCollection.insertOne(nuevoEmpleado);
    res.status(201).json({ mensaje: 'Empleado creado', id: resultado.insertedId, data: nuevoEmpleado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. PUT: Actualizar datos de un empleado por Clave
app.put('/api/empleados/:clave', async (req, res) => {
  try {
    const claveNum = Number(req.params.clave);
    const { Nombre, direccion, fechadenacimiento, sexo, tipodesangre } = req.body;

    const camposActualizar = {};
    if (Nombre !== undefined) camposActualizar.Nombre = String(Nombre);
    if (direccion !== undefined) camposActualizar.direccion = String(direccion);
    if (fechadenacimiento !== undefined) camposActualizar.fechadenacimiento = new Date(fechadenacimiento);
    if (sexo !== undefined) camposActualizar.sexo = sexo;
    if (tipodesangre !== undefined) camposActualizar.tipodesangre = String(tipodesangre);

    const resultado = await empleadosCollection.updateOne(
      { Clave: claveNum },
      { $set: camposActualizar }
    );

    if (resultado.matchedCount === 0) {
      return res.status(404).json({ mensaje: 'Empleado no encontrado' });
    }

    res.status(200).json({ mensaje: 'Empleado actualizado con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. DELETE: Eliminar empleado por Clave
app.delete('/api/empleados/:clave', async (req, res) => {
  try {
    const claveNum = Number(req.params.clave);
    const resultado = await empleadosCollection.deleteOne({ Clave: claveNum });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ mensaje: 'Empleado no encontrado' });
    }

    res.status(200).json({ mensaje: `Empleado con Clave ${claveNum} eliminado exitosamente` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor activo en el puerto ${PORT}`);
  });
});