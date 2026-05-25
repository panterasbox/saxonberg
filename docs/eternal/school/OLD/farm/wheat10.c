inherit RoomPlusCode;

void extra_create()
{
    set("short","On the Western Edge of a Vast Field of Wheat");
    set( "day_long",
      "You've come to the western-most edge of the wheatfield.  From this point "
      "on as far as you can see to the west is total blackness.  In all other "
      "directions, rows of wheat extend into the distance."
    );
    set("descs", ([
	({ "grain","row","rows", "wheat" }) :
	"This grain is rich and plentiful.  It has taken root in the warm black soil that makes up "
	"this sheltered plain.  The stalks of grain line up in careful "
	"rows as far as your eye can see.",
	({"blackness","abyss"}) :
	"You peer into the darkness, but you can see nothing more but utter "
	"nothingness.  Not even the sound of your voice can penetrate the "
	"complete lack of anything.",
      ]) );
    set(OutsideP,1);
    set("exits", ([
	"north":"/zone/null/eternal/school/farm/wheat00",
	"east":"/zone/null/eternal/school/farm/wheat11",
"northeast":"/zone/null/eternal/school/farm/wheat01",
	"southeast":"/zone/null/eternal/school/farm/wheat22",
	"south":"/zone/null/eternal/school/farm/wheat20",
      ]) );
}
