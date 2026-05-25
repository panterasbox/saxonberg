inherit RoomPlusCode;

void extra_create()
{
    set("short","The EotL Locker Room");
    set("day_long",
      "This locker room is much like any other high school or health "
      "club locker room you've ever seen, with one major difference.  " 
      "At the rear of the room, to the left of the group showers, "
      "there is a huge roaring forge.  Immense bellows pump air into "
      "the raging inferno inside, superheating and melting metal to "
      "the point where it can be shaped into armor and weapons.  There "
      "are passageways to the north and south that lead out of the "
      "locker room."
    );
    set("day_light",BRIGHT);
    set("reset_data",([
	"smith":"/zone/null/eternal/school/smith",
      ]) );
    set("exits",([
	"north":"/zone/null/eternal/school/room03",
	"south":"/zone/null/eternal/school/room01",
      ]) );
    set("descs",([
	"forge":
	"The forge is belching huge flames and producing a constant "
	"wave of intense heat that nearly bakes your skin to crisp as "
	"you look at it.  You can't imagine trying to be the smith that "
	"works the metal in this locker room.",
	({"locker","lockers"}):
	"These are standard gym lockers.  They all seem to be locked "
	"with padlocks.",
	({"shower","showers"}):
	"This is a large sectioned off part of the room with metal posts "
	"that stretch from the floor to the ceiling.  Nozzles stick out "
	"from the posts about six feet above the floor."
      ]) );
}
