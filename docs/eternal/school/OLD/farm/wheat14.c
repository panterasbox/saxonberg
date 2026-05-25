inherit RoomPlusCode;

void extra_create()
{
    set("short","Somewhere in a Vast Field of Wheat");
    set( "day_long",
"Off in the distance to the north, you can make out a solid cliff "
"face, but otherwise you are surrounded by row after row of beautiful, "
"amber waves of grain.  While pleasing to your senses, it is a bit "
"vexing in terms of navigation."
    );
    set("descs", ([
	({ "grain","row","rows", "wheat" }) :
	"This grain is rich and plentiful.  It has taken root in the warm black soil that makes up "
	"this sheltered plain.  The stalks of grain line up in careful "
	"rows as far as your eye can see.",
	({ "cliff", "face", "cliff face" }) :
	"The cliff is in the distance and appears to be very tall.  You "
	"can't tell much from this vantage point, but it doesn't look "
	"like there would be an easy way up.",
      ]) );
    set(OutsideP,1);
    set("exits", ([
	"north":"/zone/null/eternal/school/farm/wheat04",
	"northwest":"/zone/null/eternal/school/farm/wheat03",
	"northeast":"/zone/null/eternal/school/farm/wheat05",
	"west":"/zone/null/eternal/school/farm/wheat13",
	"east":"/zone/null/eternal/school/farm/wheat15",
	"south":"/zone/null/eternal/school/farm/wheat24",
	"southeast":"/zone/null/eternal/school/farm/wheat25",
	"southwest":"/zone/null/eternal/school/farm/wheat23",
      ]) );
}
