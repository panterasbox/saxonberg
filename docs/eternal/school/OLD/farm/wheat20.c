inherit RoomPlusCode;

void extra_create()
{
    set("short","On the Western Edge of a Vast Field of Wheat");
    set( "day_long",
      "You are standing at the western edge of an incredibly large field of wheat. "
      " West of here is a vast nothingness.  Your mind cannot comprehend the blackness "
      "hanging to your west.  But otherwise, you're surrounded by wheat."
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
	"north":"/zone/null/eternal/school/farm/wheat10",
	"east":"/zone/null/eternal/school/farm/wheat21",
	"northeast":"/zone/null/eternal/school/farm/wheat11",
	"southeast":"/zone/null/eternal/school/farm/wheat32",
	"south":"/zone/null/eternal/school/farm/wheat30",
      ]) );
}
