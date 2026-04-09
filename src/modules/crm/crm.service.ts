import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ComplexInterestType,
  LeadStatus,
  LeadType,
  Prisma,
  SearchSurveyStatus,
} from '@prisma/client';
import { PrismaService } from 'src/common/database/prisma.service';
import { DataAccessAuditService } from 'src/common/services/data-access-audit.service';
import { AuthUser } from 'src/common/types/auth-user.type';
import {
  assertAdmin,
  assertCompanyAccess,
  isPrivilegedRole,
} from 'src/common/utils/access.util';
import {
  CreateComplexInterestDto,
  CreateLeadDto,
  CreateSearchSessionDto,
  SubmitSearchSurveyDto,
} from './dto/create-lead.dto';

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataAccessAudit: DataAccessAuditService,
  ) {}

  private async resolveCompanyId(
    user: AuthUser,
    requestedCompanyId?: number,
  ): Promise<number> {
    if (user.entityType === 'COMPANY' && user.companyId) {
      return user.companyId;
    }

    if (requestedCompanyId && isPrivilegedRole(user.role)) {
      return requestedCompanyId;
    }

    throw new NotFoundException('Company aniqlanmadi');
  }

  async createLead(user: AuthUser | undefined, dto: CreateLeadDto) {
    let companyId = dto.companyId;

    if (!companyId && dto.complexId) {
      const complex = await this.prisma.complex.findUnique({
        where: { id: dto.complexId },
        select: { companyId: true },
      });
      companyId = complex?.companyId;
    }

    if (!companyId && dto.apartmentId) {
      const apartment = await this.prisma.apartment.findUnique({
        where: { id: dto.apartmentId },
        select: {
          complex: {
            select: { companyId: true },
          },
        },
      });
      companyId = apartment?.complex?.companyId;
    }

    const lead = await this.prisma.lead.create({
      data: {
        type: dto.type,
        fullName: dto.fullName,
        phone: dto.phone,
        address: dto.address,
        preferredAddress: dto.preferredAddress,
        companyId,
        complexId: dto.complexId,
        apartmentId: dto.apartmentId,
        masterProfileId: dto.masterProfileId,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        downPayment: dto.downPayment,
        message: dto.message,
        otherDetails: dto.otherDetails as Prisma.InputJsonValue | undefined,
        searchSnapshot: dto.searchSnapshot as Prisma.InputJsonValue | undefined,
        source: dto.source,
        userId: user?.entityType === 'USER' ? user.id : undefined,
      },
      include: {
        company: true,
        complex: true,
        apartment: true,
        masterProfile: true,
      },
    });

    return {
      message: 'Lead saqlandi',
      data: lead,
    };
  }

  async createComplexInterest(
    complexId: number,
    dto: CreateComplexInterestDto,
    user?: AuthUser,
  ) {
    const complex = await this.prisma.complex.findUnique({
      where: { id: complexId },
      include: { company: true },
    });

    if (!complex) {
      throw new NotFoundException('Complex topilmadi');
    }

    const interest = await this.prisma.complexInterest.create({
      data: {
        complexId,
        apartmentId: dto.apartmentId,
        note: dto.note,
        userId: user?.entityType === 'USER' ? user.id : undefined,
        type: dto.apartmentId
          ? ComplexInterestType.LIKE
          : ComplexInterestType.REQUEST_INFO,
      },
    });

    return {
      message: 'Qiziqish yozuvi saqlandi',
      data: interest,
    };
  }

  async createSearchSession(user: AuthUser | undefined, dto: CreateSearchSessionDto) {
    return this.prisma.searchSession.create({
      data: {
        intentType: dto.intentType,
        query: dto.query as Prisma.InputJsonValue,
        resultsCount: dto.resultsCount ?? 0,
        userId: user?.entityType === 'USER' ? user.id : undefined,
      },
    });
  }

  async submitSearchSurvey(
    id: number,
    user: AuthUser | undefined,
    dto: SubmitSearchSurveyDto,
  ) {
    const session = await this.prisma.searchSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Search session topilmadi');
    }

    const updatedSession = await this.prisma.searchSession.update({
      where: { id },
      data: {
        surveyStatus: dto.surveyStatus,
        notes: dto.notes,
        fullName: dto.fullName,
        phone: dto.phone,
        address: dto.address,
      },
    });

    let lead: unknown = null;

    if (
      dto.surveyStatus === SearchSurveyStatus.NOT_FOUND ||
      dto.surveyStatus === SearchSurveyStatus.STILL_SEARCHING
    ) {
      const searchQuery = session.query as Record<string, unknown>;
      const leadCompanyId =
        typeof searchQuery.companyId === 'number' ? searchQuery.companyId : undefined;

      lead = await this.prisma.lead.upsert({
        where: { searchSessionId: session.id },
        update: {
          surveyStatus: dto.surveyStatus,
          fullName: dto.fullName ?? 'Anonim lead',
          phone: dto.phone ?? 'unknown',
          address: dto.address,
          message: dto.notes,
          searchSnapshot: session.query as Prisma.InputJsonValue,
          source: 'SEARCH_SURVEY',
          status: LeadStatus.NEW,
        },
        create: {
          type: LeadType.SEARCH_RECOVERY,
          surveyStatus: dto.surveyStatus,
          fullName: dto.fullName ?? 'Anonim lead',
          phone: dto.phone ?? 'unknown',
          address: dto.address,
          message: dto.notes,
          searchSnapshot: session.query as Prisma.InputJsonValue,
          source: 'SEARCH_SURVEY',
          status: LeadStatus.NEW,
          companyId: leadCompanyId,
          userId: user?.entityType === 'USER' ? user.id : undefined,
          searchSessionId: session.id,
        },
      });
    }

    return {
      message: 'Survey saqlandi',
      session: updatedSession,
      lead,
    };
  }

  async getCompanyDashboard(user: AuthUser) {
    const companyId = await this.resolveCompanyId(user);

    const [
      totalLeads,
      newLeads,
      contactedLeads,
      wonLeads,
      lostLeads,
      complexCount,
      complexInterestCount,
      apartmentLikeCount,
      apartmentViewCount,
      companyViewCount,
      latestLeads,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { companyId } }),
      this.prisma.lead.count({ where: { companyId, status: LeadStatus.NEW } }),
      this.prisma.lead.count({ where: { companyId, status: LeadStatus.CONTACTED } }),
      this.prisma.lead.count({ where: { companyId, status: LeadStatus.WON } }),
      this.prisma.lead.count({ where: { companyId, status: LeadStatus.LOST } }),
      this.prisma.complex.count({ where: { companyId } }),
      this.prisma.complexInterest.count({
        where: { complex: { companyId } },
      }),
      this.prisma.apartmentLike.count({
        where: { apartment: { complex: { companyId } } },
      }),
      this.prisma.apartmentView.count({
        where: { apartment: { complex: { companyId } } },
      }),
      this.prisma.companyView.count({ where: { companyId } }),
      this.prisma.lead.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totals: {
        totalLeads,
        newLeads,
        contactedLeads,
        wonLeads,
        lostLeads,
        complexCount,
        complexInterestCount,
        apartmentLikeCount,
        apartmentViewCount,
        companyViewCount,
      },
      latestLeads,
    };
  }

  async getCompanyLeads(user: AuthUser) {
    const companyId = await this.resolveCompanyId(user);

    const [leads, apartmentLikes, complexInterests] = await Promise.all([
      this.prisma.lead.findMany({
        where: { companyId },
        include: {
          user: true,
          complex: true,
          apartment: true,
          masterProfile: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.apartmentLike.findMany({
        where: {
          apartment: {
            complex: {
              companyId,
            },
          },
        },
        include: {
          user: true,
          apartment: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.complexInterest.findMany({
        where: {
          complex: {
            companyId,
          },
        },
        include: {
          user: true,
          complex: true,
          apartment: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      leads,
      apartmentLikes,
      complexInterests,
    };
  }

  async getLead(id: number, user: AuthUser) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        user: true,
        company: true,
        complex: true,
        apartment: true,
        masterProfile: {
          include: {
            user: true,
          },
        },
        searchSession: true,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead topilmadi');
    }

    if (lead.companyId) {
      assertCompanyAccess(lead.companyId, user, 'Bu lead sizga tegishli emas');
    } else {
      assertAdmin(user);
    }

    const openedAudit = await this.dataAccessAudit.logAccess({
      entityType: 'LEAD',
      entityId: lead.id,
      action: 'OPEN',
      actor: user,
      description: `${lead.fullName} leadi ochildi`,
      payload: {
        leadId: lead.id,
        companyId: lead.companyId,
      } as Prisma.InputJsonValue,
    });

    await this.prisma.lead.update({
      where: { id },
      data: {
        isOpened: true,
        openedAt: openedAudit.createdAt,
        openedBy: `${user.entityType}:${user.id}`,
      },
    });

    return lead;
  }

  async updateLeadStatus(id: number, status: LeadStatus, user: AuthUser) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      select: { id: true, companyId: true },
    });

    if (!lead) {
      throw new NotFoundException('Lead topilmadi');
    }

    if (lead.companyId) {
      assertCompanyAccess(lead.companyId, user, 'Bu lead sizga tegishli emas');
    } else {
      assertAdmin(user);
    }

    return this.prisma.lead.update({
      where: { id },
      data: { status },
    });
  }

  async deleteLead(id: number, user: AuthUser) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      select: { id: true, companyId: true, fullName: true },
    });

    if (!lead) {
      throw new NotFoundException('Lead topilmadi');
    }

    if (lead.companyId) {
      assertCompanyAccess(lead.companyId, user, 'Bu lead sizga tegishli emas');
    } else {
      assertAdmin(user);
    }

    const latestOpenAudit = await this.dataAccessAudit.findLatestAudit(
      'LEAD',
      id,
      'OPEN',
    );

    await this.dataAccessAudit.logAccess({
      entityType: 'LEAD',
      entityId: id,
      action: 'DELETE',
      actor: user,
      description: `${lead.fullName} leadi o‘chirildi`,
      replyToMessageId: latestOpenAudit?.telegramMessageId ?? null,
      payload: {
        deletedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    });

    return this.prisma.lead.delete({ where: { id } });
  }

  async getLandingRecommendations(user: AuthUser) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        regionId: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const apartments = await this.prisma.apartment.findMany({
      where: currentUser.regionId ? { regionId: currentUser.regionId } : undefined,
      include: {
        category: true,
        complex: true,
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const masters = await this.prisma.masterProfile.findMany({
      where: currentUser.regionId
        ? {
            user: {
              regionId: currentUser.regionId,
            },
          }
        : undefined,
      include: {
        user: true,
        categories: {
          include: {
            jobCategory: true,
          },
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const scoredApartments = apartments
      .map((apartment) => ({
        ...apartment,
        distanceScore:
          currentUser.latitude != null &&
          currentUser.longitude != null &&
          apartment.complex?.latitude != null &&
          apartment.complex?.longitude != null
            ? Math.abs(currentUser.latitude - apartment.complex.latitude) +
              Math.abs(currentUser.longitude - apartment.complex.longitude)
            : Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => a.distanceScore - b.distanceScore)
      .slice(0, 8);

    return {
      apartments: scoredApartments,
      masters: masters.slice(0, 8),
    };
  }
}
