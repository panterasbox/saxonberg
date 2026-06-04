inherit RoomPlusCode;

void extra_create()
{
    set("short","In a Fallow Field");
    set( "day_long",
      "You're stading in furrows of freshly tilled earth.  There "
      "is a vast field of wheat directly to your west "
      "that seems to stretch on as far as you can see to the south.  To the "
      "north, the field continues until it hits a steep cliff face which runs to "
      "the east and west.  The tilled earth continues to the east."
    );
    set("descs", ([
	({ "grain","row","rows", "wheat" }) :
	"This grain is rich and plentiful.  It has taken root in the warm black soil that makes up "
	"this sheltered plain.  The stalks of grain line up in careful "
	"rows as far as your eye can see.",
	({ "cliff", "face", "cliff face" }) :
	"This cliff face goes straight up for about 300 feet and then gradually "
	"inclines to form huge, sky-piercing peaks of granite.  As you incline "
	"your head to look at the cliff, high in the sky you see something "
	"floating along up there.  It's not a bird, it's not a star...  What "
	"could it be?",
	({"soil","tilled soil","black soil","dirt"}) :
	"This rich, warm soil has been plowed, but left unseeded to increase its growth "
	"potential in the next season.",
      ]) );
    set(OutsideP,1);
    set("exits", ([
	"north":"/zone/null/eternal/school/farm/wheat07",
	"northeast":"/zone/null/eternal/school/farm/wheat08",
	"northwest":"/zone/null/eternal/school/farm/wheat06",
	"west":"/zone/null/eternal/school/farm/wheat16",
	"east":"/zone/null/eternal/school/farm/wheat18",
	"south":"/zone/null/eternal/school/farm/wheat27",
	"southeast":"/zone/null/eternal/school/farm/wheat28",
	"southwest":"/zone/null/eternal/school/farm/wheat26",
      ]) );
}
