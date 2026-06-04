inherit RoomPlusCode;

void extra_create()
{
    set("short","Somewhere in a Vast Field of Wheat");
    set( "day_long",
"If you like wheat, this is the place to be.  All around you stretch rows "
"and rows of golden wheat.  This is the stuff bread is made of.  "
"Visions of scythes and sheaves run through your mind.  Off to "
"the north, you can see a dull cliff face stretching into the sky."
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
	"north":"/zone/null/eternal/school/farm/wheat05",
	"northwest":"/zone/null/eternal/school/farm/wheat04",
	"northeast":"/zone/null/eternal/school/farm/wheat06",
	"west":"/zone/null/eternal/school/farm/wheat14",
	"east":"/zone/null/eternal/school/farm/wheat16",
	"south":"/zone/null/eternal/school/farm/wheat25",
	"southeast":"/zone/null/eternal/school/farm/wheat26",
	"southwest":"/zone/null/eternal/school/farm/wheat24",
      ]) );
}
