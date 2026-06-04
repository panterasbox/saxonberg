inherit RoomPlusCode;

void extra_create()
{
    set("short","Somewhere in a Vast Field of Wheat");
    set( "day_long",
      "You are standing in an immense field of wheat.  To the south and "
      "east, the rows of wheat stretch out as far as you "
      "can see.  To the north, in the distance, you can see what appears "
      "to be a cliff face cutting off the field.  To the west, it seems "
      "as if the wheat tapers off somehow."
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
	"north":"/zone/null/eternal/school/farm/wheat01",
	"northwest":"/zone/null/eternal/school/farm/wheat00",
	"northeast":"/zone/null/eternal/school/farm/wheat02",
	"west":"/zone/null/eternal/school/farm/wheat10",
	"east":"/zone/null/eternal/school/farm/wheat12",
	"south":"/zone/null/eternal/school/farm/wheat21",
	"southeast":"/zone/null/eternal/school/farm/wheat22",
	"southwest":"/zone/null/eternal/school/farm/wheat20",
      ]) );
}
