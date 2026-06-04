inherit RoomPlusCode;

void extra_create()
{
    set("short","At the Northeastern Corner of a Fallow Field");
    set( "day_long",
      "You are standing at the northeastern corner of the wheatfield.  This part of the field "
      "has been left fallow for the season and furrows of soil surround you.  To the east lies a "
      "wide river, probably more than a mile across at this point.  You can see no way "
      "to get across.  The river runs north and south, as far as you can see.  To your "
      "north is an impassable cliff face of solid granite.  The cliff runs to the west into the distance."
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
	({"river", "water" }) :
	"This river seems to be nearly impassable.  There is no bridge "
	"in sight, and you can't imagine trying to build one yourself.  And the "
	"current seems to be extraordinarily swift, to the point where swimming "
	"would be next to impossible.",
      ]) );
    set(OutsideP,1);
    set("exits", ([
	"west":"/zone/null/eternal/school/farm/wheat08",
	"south":"/zone/null/eternal/school/farm/wheat19",
	"southwest":"/zone/null/eternal/school/farm/wheat18",
      ]) );
}
