# equipos_service.py
from flask import Blueprint, request, jsonify, render_template, make_response
import mysql.connector
import pusher

# Configurar conexión local de este microservicio
def get_connection():
    return mysql.connector.connect(
        host="185.232.14.52",
        database="u760464709_23005014_bd",
        user="u760464709_23005014_usr",
        password="B|7k3UPs3&P"
    )

# Pusher (compartido, pero aquí lo tienes solo para equipos)
pusher_client = pusher.Pusher(
    app_id='2048639',
    key='85576a197a0fb5c211de',
    secret='bbd4afc18e15b3760912',
    cluster='us2',
    ssl=True
)

# Usamos Blueprint para aislar rutas
equipos_bp = Blueprint("equipos_bp", __name__)

@equipos_bp.route("/equipos")
def equipos():
    return render_template("equipos.html")

@equipos_bp.route("/tbodyEquipos")
def tbodyEquipos():
    con = get_connection()
    cursor = con.cursor(dictionary=True)
    sql = """
    SELECT idEquipo, nombreEquipo
    FROM equipos
    ORDER BY idEquipo DESC
    LIMIT 10 OFFSET 0
    """
    cursor.execute(sql)
    registros = cursor.fetchall()
    con.close()
    return render_template("tbodyEquipos.html", equipos=registros)

@equipos_bp.route("/equipos/buscar", methods=["GET"])
def buscarEquipos():
    con = get_connection()
    args = request.args
    busqueda = f"%{args.get('busqueda', '')}%"

    cursor = con.cursor(dictionary=True)
    sql = """
    SELECT idEquipo, nombreEquipo
    FROM equipos
    WHERE nombreEquipo LIKE %s
    ORDER BY idEquipo DESC
    LIMIT 10 OFFSET 0
    """
    cursor.execute(sql, (busqueda,))
    registros = cursor.fetchall()
    con.close()
    return make_response(jsonify(registros))

@equipos_bp.route("/equipo", methods=["POST"])
def guardarEquipo():
    con = get_connection()
    idEquipo = request.form.get("idEquipo")
    nombreEquipo = request.form.get("nombreEquipo")

    cursor = con.cursor()
    if idEquipo:
        sql = "UPDATE equipos SET nombreEquipo=%s WHERE idEquipo=%s"
        val = (nombreEquipo, idEquipo)
    else:
        sql = "INSERT INTO equipos (nombreEquipo) VALUES (%s)"
        val = (nombreEquipo,)

    cursor.execute(sql, val)
    con.commit()
    con.close()

    pusher_client.trigger('equiposchannel', 'equiposevent', {'message': 'Equipo actualizado'})
    return make_response(jsonify({"mensaje": "Equipo guardado"}))

@equipos_bp.route("/equipo/eliminar", methods=["POST"])
def eliminarEquipo():
    con = get_connection()
    id = request.form.get("id")
    cursor = con.cursor()
    sql = "DELETE FROM equipos WHERE idEquipo=%s"
    cursor.execute(sql, (id,))
    con.commit()
    con.close()

    pusher_client.trigger('equiposchannel', 'equiposevent', {'message': 'Equipo eliminado'})
    return make_response(jsonify({"mensaje": "Equipo eliminado"}))
