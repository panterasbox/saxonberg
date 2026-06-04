inherit RoomPlusCode;

void extra_create()
{
    set("short","Somewhere in a Vast Field of Wheat");
    set( "day_long",
"You're in the middle of what seems to be an endless wheatfield.  "
"Off in the distance to the north, there is a huge cliff face, but "
"otherwise the rows of golden wheat stretch out as far as you "
"can see.  It's sort of idyllic, really."
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
	"north":"/zone/null/eternal/school/farm/wheat03",
	"northwest":"/zone/null/eternal/school/farm/wheat02",
	"northeast":"/zone/null/eternal/school/farm/wheat04",
	"west":"/zone/null/eternal/school/farm/wheat12",
	"east":"/zone/null/eternal/school/farm/wheat14",
	"south":"/zone/null/eternal/school/farm/wheat23",
	"southeast":"/zone/null/eternal/school/farm/wheat24",
	"southwest":"/zone/null/eternal/school/farm/wheat22",
      ]) );
}
