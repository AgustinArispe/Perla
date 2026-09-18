# Data model
El frontend consume los contratos existentes. Los importes viajan como centavos enteros y el peso como gramos. La sesión usa cookie HttpOnly; solo CSRF y usuario se exponen a React. El carrito se guarda en el servidor. Ante una respuesta incierta, se conserva el payload y la clave por usuario para consultar/reintentar sin duplicar.
