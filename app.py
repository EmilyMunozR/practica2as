# python.exe -m venv .venv
# cd .venv/Scripts
# activate.bat
# py -m ensurepip --upgrade
# pip install -r requirements.txt

from functools import wraps
from flask import Flask, render_template, request, jsonify, make_response, session

from flask_cors import CORS, cross_origin

import mysql.connector.pooling
import pusher
import pytz
import datetime

app            = Flask(__name__)
app.secret_key = "Test12345"
CORS(app)

con_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="my_pool",
    pool_size=5,
    host="185.232.14.52",
    database="u760464709_23005014_bd",
    user="u760464709_23005014_usr",
    password="B|7k3UPs3&P"
)

def pusherBase(channel, event, message="hello"):
    pusher_client = pusher.Pusher(
        app_id='2048639',
        key='85576a197a0fb5c211de',
        secret='bbd4afc18e15b3760912',
        cluster='us2',
        ssl=True
    )
    pusher_client.trigger(channel, event, {'message': message})
    return make_response(jsonify({}))

def pusherIntegrantes():
    return pusherBase("integranteschannel", "integrantesevent", "hello Integrantes")

def pusherEquiposIntegrantes():
    return pusherBase("equiposIntegranteschannel", "equiposIntegrantesevent", "hello Equipos Integrantes")

def pusherEquipos():
    return pusherBase("equiposchannel", "equiposevent", "hello Equipos")

def pusherProyectos():
    return pusherBase("proyectoschannel", "proyectosevent", "hello Proyectos")

def pusherProyectosAvances():
    return pusherBase("proyectosAvanceschannel", "proyectosAvancesevent", "hello Proyectos Avances")

def login(fun):
    @wraps(fun)
    def decorador(*args, **kwargs):
        if not session.get("login"):
            return jsonify({
                "estado": "error",
                "respuesta": "No has iniciado sesión"
            }), 401
        return fun(*args, **kwargs)
    return decorador
    
# Ruta de Inicio (Landin-Page)
@app.route("/")
def landingPage():
    return render_template("landing-page.html")

# Te regresa a (index)
@app.route("/dashboard")
def dashboard():
    return render_template("login.html")

@app.route("/login")
def appLogin():
    return render_template("login.html")
    

# Funcionamiento del Inicio de sesion en base a lo llenado del formulario
@app.route("/iniciarSesion", methods=["POST"])
def iniciarSesion():
    
    usuario    = request.form["txtUsuario"]
    contrasena = request.form["txtContrasena"]
        
    con    = con_pool.get_connection()
    cursor = con.cursor(dictionary=True)
    sql    = """
    SELECT IdUsuario, Nombre, Tipo_Usuario
    FROM usuarios
            
    WHERE Nombre = %s 
    AND Contrasena = %s
    """
    val = (usuario, contrasena)
        
    cursor.execute(sql, val)
    registros = cursor.fetchall()
            
    if cursor:
        cursor.close()
    if con and con.is_connected():
        con.close()
            
    session["login"]      = False
    session["login-usr"]  = None
    session["login-tipo"] = 0
            
    if registros:
        usuario = registros[0]
        session["login"]      = True
        session["login-usr"]  = usuario["Nombre"]
        session["login-tipo"] = usuario["Tipo_Usuario"]
        return jsonify({
            "mensaje": "Inicio de sesión exitoso",
            "usuario": usuario
        })
    else:
        return jsonify({
            "error": "Credenciales incorrectas"
        }), 401

@app.route("/cerrarSesion", methods=["POST"])
@login
def cerrarSesion():
    session["login"]      = False
    session["login-usr"]  = None
    session["login-tipo"] = 0
    return make_response(jsonify({}))

@app.route("/preferencias")
@login
def preferencias():
    return make_response(jsonify({
        "usr": session.get("login-usr"),
        "tipo": session.get("login-tipo", 2)
    }))
    
#
#///////////////////////////// INTEGRANTES ///////////
#   Rutas  De  Integrantes    
@app.route("/integrantes")
def integrantes():
    return render_template("integrantes.html")

# Traer los registros de integrantes en el tbody
@app.route("/tbodyIntegrantes")
def tbodyProductos():
    if not con.is_connected():
        con.reconnect()

    cursor = con.cursor(dictionary=True)
    sql    = """
    SELECT idIntegrante,
           nombreIntegrante

    FROM integrantes

    ORDER BY idIntegrante DESC
    LIMIT 10 OFFSET 0
    """

    cursor.execute(sql)
    registros = cursor.fetchall()
    
    return render_template("tbodyIntegrantes.html", integrantes=registros)

# Funcionamiento de la busuqeda de integrantes
@app.route("/integrantes/buscar", methods=["GET"])
@login
def buscarIntegrantes():
    args     = request.args
    busqueda = args["busqueda"]
    busqueda = f"%{busqueda}%"
    
    try:
        con    = con_pool.get_connection()
        cursor = con.cursor(dictionary=True)
        sql    = """
        
        SELECT idIntegrante,
               nombreIntegrante
    
        FROM integrantes
    
        WHERE nombreIntegrante LIKE %s
    
        ORDER BY idIntegrante DESC
        LIMIT 10 OFFSET 0
        """
        val = (busqueda,)

        cursor.execute(sql, val)
        registros = cursor.fetchall()

    except mysql.connector.errors.ProgrammingError as error:
        registros = []

    finally:
        if cursor:
            con.close()
        if con and con.is_connected():
            con.close()

    return make_response(jsonify(registros))

# Funionamiento de insertar integrantes
@app.route("/integrante", methods=["POST"])
@login
def guardarIntegrante():
    idIntegrante = request.form["idIntegrante"]
    nombreIntegrante = request.form["nombreIntegrante"]
    
    con    = con_pool.get_connection()
    cursor = con.cursor()

    if idIntegrante:
        sql = """
        UPDATE integrantes
        SET nombreIntegrante = %s
        WHERE idIntegrante = %s
        """
        val = (nombreIntegrante, idIntegrante)
    else:
        sql = """
        INSERT INTO integrantes (nombreIntegrante)
        VALUES (%s)
        """
        val = (nombreIntegrante,)

    cursor.execute(sql, val)
    con.commit()
    if cursor:
        con.close()
    if con and con.is_connected():
        con.close()

    pusherIntegrantes()
    return make_response(jsonify({"mensaje": "Integrante guardado"}))

# Funcionamiento de modificar integrantes
@app.route("/integrante/<int:id>")
@login
def editarIntegrante(id):
    con    = con_pool.get_connection()
    cursor = con.cursor(dictionary=True)
    sql    = """
    
    SELECT idIntegrante, nombreIntegrante
    
    FROM integrantes
    
    WHERE idIntegrante = %s
    """
    val = (id,)

    cursor.execute(sql, val)
    registros = cursor.fetchall()
    if cursor:
        con.close()
    if con and con.is_connected():
        con.close()

    return make_response(jsonify({"mensaje": "Integrante Modificado"}))

# Funcionamiento de eliminar integrantes
@app.route("/integrante/eliminar", methods=["POST"])
def eliminarIntegrante():
    id = request.form("id")

    con     = con_pool.get_connection()
    cursor  = con.cursor(dictionary=True)
    sql     = """
    DELETE FROM integrantes 
    WHERE idIntegrante = %s
    """
    
    val = (id,)
    
    cursor.execute(sql, val)
    con.commit()
    if cursor:
        con.close()
    if con and con.is_connected():
        con.close()
        
    pusherIntegrantes()
    return make_response(jsonify({"mensaje": "Integrante Eliminado"}))


#   Rutas  De  Proyectos Avances    
@app.route("/proyectosavances")
def proyectosavances():
    if not con.is_connected():
        con.reconnect()

    cursor = con.cursor(dictionary=True)
    # Funcion para inner join demiselctt
    sql = """
    SELECT idProyecto, tituloProyecto
    FROM proyectos
    ORDER BY tituloProyecto ASC
    """
    cursor.execute(sql)
    proyectos = cursor.fetchall()
    con.close()

    # funcion para mandarlos a la funcion lista deljsjsjs
    return render_template("proyectosavances.html", proyectos=proyectos)
@app.route("/proyectos/lista")
def listaProyectos():
    try:
        if not con.is_connected():
            con.reconnect()

        cursor = con.cursor(dictionary=True)
        sql = """
        SELECT idProyecto, tituloProyecto
        FROM proyectos
        ORDER BY tituloProyecto ASC
        """
        cursor.execute(sql)
        proyectos = cursor.fetchall()
        con.close()
        
        return make_response(jsonify(proyectos))
        
    except Exception as e:
        return make_response(jsonify({"error": str(e)}), 500)

@app.route("/tbodyProyectosAvances")
def tbodyProyectosAvances():
    if not con.is_connected():
        con.reconnect()

    cursor = con.cursor(dictionary=True)
    sql = """
    SELECT pa.idProyectoAvance,
           pa.progreso,
           pa.descripcion,
           pa.fechaHora,
           p.tituloProyecto
    FROM proyectosavances pa
    INNER JOIN proyectos p ON pa.idProyecto = p.idProyecto
    ORDER BY pa.idProyectoAvance DESC
    LIMIT 10 OFFSET 0
    """
    cursor.execute(sql)
    registros = cursor.fetchall()
    con.close()
    
    return render_template("tbodyProyectosAvances.html", proyectosavances=registros)


@app.route("/proyectoavance", methods=["POST"])
def guardarProyectoAvance():
    if not con.is_connected():
        con.reconnect()

    idProyectoAvance = request.form.get("idProyectoAvance")
    idProyecto       = request.form.get("idProyecto")  
    progreso         = request.form.get("txtProgreso")
    descripcion      = request.form.get("txtDescripcion")

    cursor = con.cursor()

    if idProyectoAvance:  # Update
        sql = """
        UPDATE proyectosavances
        SET idProyecto = %s,
            progreso   = %s,
            descripcion = %s,
            fechaHora = NOW()
        WHERE idProyectoAvance = %s
        """
        val = (idProyecto, progreso, descripcion, idProyectoAvance)
    else:  # Insert
        sql = """
        INSERT INTO proyectosavances (idProyecto, progreso, descripcion, fechaHora)
        VALUES (%s, %s, %s, NOW())
        """
        val = (idProyecto, progreso, descripcion)

    cursor.execute(sql, val)
    con.commit()
    con.close()

    pusherProyectosAvances()
    return make_response(jsonify({"mensaje": "Proyecto Avance guardado"}))


@app.route("/proyectoavance/eliminar", methods=["POST"])
def eliminarProyectoAvance():
    if not con.is_connected():
        con.reconnect()

    id = request.form.get("id")

    cursor = con.cursor(dictionary=True)
    sql = """
    DELETE FROM proyectosavances 
    WHERE idProyectoAvance = %s
    """
    val = (id,)
    
    cursor.execute(sql, val)
    con.commit()
    con.close()

    pusherProyectosAvances()
    return make_response(jsonify({"mensaje": "Proyecto Avance eliminado"}))

#/////////////////////Equipos/////////////////////////////
  
#/// Lo borre pk no se comentar

#////////////////////////////////////////////////////    


@app.route("/proyectos")
def proyectos():
    return render_template("proyectos.html")

@app.route("/tbodyProyectos")
def tbodyProyectos():
    if not con.is_connected():
        con.reconnect()

    cursor = con.cursor(dictionary=True)
    sql    = """
    SELECT 
            p.idProyecto,
            p.tituloProyecto,
            e.nombreEquipo,
            p.objetivo,
            p.estado

    FROM proyectos AS p

    INNER JOIN equipos AS e
            ON p.idEquipo = e.idEquipo
    
    ORDER BY p.estado DESC

    LIMIT 10 OFFSET 0
    """

    cursor.execute(sql)
    registros = cursor.fetchall()
    
    return render_template("tbodyProyectos.html", proyectos=registros)

@app.route("/proyectos/buscar", methods=["GET"])
def buscarProyectos():
    if not con.is_connected():
        con.reconnect()

    args     = request.args
    busqueda = args["busqueda"]
    busqueda = f"%{busqueda}%"

    cursor = con.cursor(dictionary=True)
    sql    = """

    SELECT p.idProyecto, p.tituloProyecto, p.objetivo, p.estado
    FROM proyectos AS p
    INNER JOIN equipos AS e ON p.idEquipo = e.idEquipo
    WHERE p.tituloProyecto LIKE %s    -- FALTA ESTA LÍNEA
    ORDER BY p.estado DESC
    LIMIT 10 OFFSET 0
    
    """
    val = (busqueda,)

    try:
        cursor.execute(sql, val)
        registros = cursor.fetchall()

    except mysql.connector.errors.ProgrammingError as error:
        print(f"Ocurrió un error de programación en MySQL: {error}")
        registros = []

    finally:
        con.close()

    return make_response(jsonify(registros))

@app.route("/proyectos", methods=["POST"])
def guardarProyectos():
    if not con.is_connected():
        con.reconnect()

    idProyecto = request.form["idProyecto"]
    tituloProyecto = request.form["tituloProyecto"]
    idEquipo = request.form["idEquipo"]
    objetivo = request.form["objetivo"]
    estado = request.form["estado"]
    
    cursor = con.cursor()

    if idProyecto:
        sql = """
        UPDATE proyectos
        SET tituloProyecto = %s,
            idEquipo = %s,
            objetivo = %s,
            estado = %s
        WHERE idProyecto = %s
        """
        val = (tituloProyecto, idEquipo, objetivo, estado, idProyecto)
    else:
        sql = """
        INSERT INTO proyectos (tituloProyecto, idEquipo, objetivo, estado)
        VALUES (%s, %s, %s, %s)
        """
        val = (tituloProyecto, idEquipo, objetivo, estado)

    cursor.execute(sql, val)
    con.commit()
    con.close()

    pusherProyectos()
    return make_response(jsonify({"mensaje": "Proyecto guardado"}))

############# Eliminar
@app.route("/proyectos/eliminar", methods=["POST"])
def eliminarProyecto():
    if not con.is_connected():
        con.reconnect()

    id = request.form.get("id")

    cursor = con.cursor(dictionary=True)
    sql    = """
    DELETE FROM proyectos
    WHERE idProyecto = %s
    """
    val    = (id,)

    try:
        cursor.execute(sql, val)
        con.commit()
        
        # CORRECCIÓN: Agregar la llamada a pusherProyectos()
        pusherProyectos()
        
        return make_response(jsonify({"mensaje": "Proyecto eliminado correctamente"}))
        
    except mysql.connector.Error as error:
        con.rollback()
        print(f"Error al eliminar proyecto: {error}")
        return make_response(jsonify({"error": "Error al eliminar proyecto"}), 500)
        
    finally:
        con.close()


#//////////////esta wea me trae una lista pal inerjoin //////////////////////////////////////////////////////////
@app.route("/equipos/lista")
def cargarEquipos():
    if not con.is_connected():
        con.reconnect()

    cursor = con.cursor(dictionary=True)
    sql = """
    SELECT idEquipo, nombreEquipo
    FROM equipos
    ORDER BY nombreEquipo ASC
    """
    
    cursor.execute(sql)
    registros = cursor.fetchall()
    con.close()
    
    return make_response(jsonify(registros))
#////////////////////////////////////////////////////////////////////////////////////////////////////////////////

@app.route("/equiposintegrantes")
def equiposintegrantes():
    return render_template("equiposintegrantes.html")

@app.route("/tbodyEquiposIntegrantes")
def tbodyEquiposIntegrantes():
    if not con.is_connected():
        con.reconnect()
    cursor = con.cursor(dictionary=True)
    
    sql = """
        SELECT 
                ei.idEquipoIntegrante,
                e.nombreEquipo,
                i.nombreIntegrante,
                ei.fechaUnion
        FROM equiposintegrantes ei
        INNER JOIN equipos e 
                ON e.idEquipo = ei.idEquipo
        INNER JOIN integrantes i 
                ON i.idIntegrante = ei.idIntegrante
        ORDER BY ei.idEquipoIntegrante DESC
        LIMIT 10 OFFSET 0
    """
    cursor.execute(sql)
    registros = cursor.fetchall()

    cursor.close()
    return render_template("tbodyEquiposIntegrantes.html", equiposintegrantes=registros)
    
@app.route("/equiposintegrantes/buscar", methods=["GET"])
def buscarEquiposIntegrantes():
    if not con.is_connected():
        con.reconnect()

    args     = request.args
    busqueda = args["busqueda"]
    busqueda = f"%{busqueda}%"

    cursor = con.cursor(dictionary=True)
    sql    = """

    SELECT ei.idEquipoIntegrante, e.nombreEquipo, i.nombreIntegrante
    FROM equiposintegrantes ei
    INNER JOIN equipos e ON e.idEquipo = ei.idEquipo
    INNER JOIN integrantes i ON i.idIntegrante = ei.idIntegrante
    ORDER BY ei.idEquipoIntegrante DESC
    LIMIT 10 OFFSET 0
    
    """
    val = (busqueda,)

    try:
        cursor.execute(sql, val)
        registros = cursor.fetchall()

    except mysql.connector.errors.ProgrammingError as error:
        print(f"Ocurrió un error de programación en MySQL: {error}")
        registros = []

    finally:
        con.close()

    return make_response(jsonify(registros))

@app.route("/equiposintegrantes", methods=["POST"])
def guardarEquiposIntegrantes():
    if not con.is_connected():
        con.reconnect()

    idEquipoIntegrante = request.form["idEquipoIntegrante"]
    idEquipo = request.form["idEquipo"]
    idIntegrante = request.form["idIntegrante"]
    
    cursor = con.cursor()

    if idEquipoIntegrante:
        sql = """
        UPDATE equiposintegrantes
        SET idEquipo = %s,
            idIntegrante = %s,
            fechaUnion = NOW()
        WHERE idEquipoIntegrante = %s
        """
        val = (idEquipo, idIntegrante, idEquipoIntegrante)
    else:
        sql = """
        INSERT INTO equiposintegrantes (idEquipo, idIntegrante, fechaUnion)
        VALUES (%s, %s, NOW())
        """
        val = (idEquipo, idIntegrante)

    cursor.execute(sql, val)
    con.commit()
    con.close()

    pusherEquiposIntegrantes()
    return make_response(jsonify({"mensaje": "EquipoIntegrante guardado"}))

@app.route("/equiposintegrantes/eliminar", methods=["POST"])
def eliminarequiposintegrantes():
    if not con.is_connected():
        con.reconnect()

    id = request.form.get("id")

    cursor = con.cursor(dictionary=True)
    sql = """
    DELETE FROM equiposintegrantes 
    WHERE idEquipoIntegrante = %s
    """
    val = (id,)
    
    cursor.execute(sql, val)
    con.commit()
    con.close()

    pusherEquiposIntegrantes()
    return make_response(jsonify({"mensaje": "Equipo Integrante eliminado"}))

@app.route("/integrantes/lista")
def cargarIntegrantes():
    if not con.is_connected():
        con.reconnect()

    cursor = con.cursor(dictionary=True)
    sql = """
    SELECT idIntegrante , nombreIntegrante 
    FROM integrantes
    ORDER BY nombreIntegrante ASC
    """
    
    cursor.execute(sql)
    registros = cursor.fetchall()
    con.close()
    
    return make_response(jsonify(registros))
    
#////////////////////////////////////////////////////////////////////////////////////////////////////////////////

if __name__ == "__main__":
    app.run(debug=True, port=5000)
























