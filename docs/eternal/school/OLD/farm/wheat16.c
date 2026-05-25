inherit RoomPlusCode;

void extra_create()
{
    set("short","Somewhere in a Vast Field of Wheat");
    set( "day_long",
"You are standing amid seemingly thousands of rows of wheat that "
"stretch without end to the horizon.  To the north, however, they "
"stretch until they hit a large cliff face that looms above the "
"field."
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
	"north":"/zone/null/eternal/school/farm/wheat06",
	"northwest":"/zone/null/eternal/school/farm/wheat05",
	"northeast":"/zone/null/eternal/school/farm/wheat07",
	"west":"/zone/null/eternal/school/farm/wheat15",
	"east":"/zone/null/eternal/school/farm/wheat17",
	"south":"/zone/null/eternal/school/farm/wheat26",
	"southeast":"/zone/null/eternal/school/farm/wheat27",
	"southwest":"/zone/null/eternal/school/farm/wheat25",
      ]) );
}
